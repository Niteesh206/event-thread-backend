import express from 'express';
import { Gossip, GossipComment, User } from '../models/index.js';

const router = express.Router();

// GET /api/gossips - Get all gossips
router.get('/', async (req, res) => {
  try {
    const { sortBy = 'newest' } = req.query;
    
    let sortOptions = { createdAt: -1 }; // Default: newest first
    
    if (sortBy === 'popular') {
      sortOptions = { upvotes: -1 };
    } else if (sortBy === 'controversial') {
      sortOptions = { downvotes: -1 };
    }

    const gossips = await Gossip.find()
      .sort(sortOptions)
      .lean();

    const gossipsWithComments = await Promise.all(
      gossips.map(async (gossip) => {
        const comments = await GossipComment.find({ gossipId: gossip._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          id: gossip._id.toString(),
          content: gossip.content,
          author: gossip.isAnonymous ? 'Anonymous' : gossip.authorUsername,
          authorId: gossip.author.toString(),
          isAnonymous: gossip.isAnonymous,
          upvotes: gossip.upvotedBy?.length || 0,
          downvotes: gossip.downvotedBy?.length || 0,
          upvotedBy: gossip.upvotedBy?.map(id => id.toString()) || [],
          downvotedBy: gossip.downvotedBy?.map(id => id.toString()) || [],
          comments: comments.map(comment => ({
            id: comment._id.toString(),
            content: comment.content,
            author: comment.isAnonymous ? 'Anonymous' : comment.authorUsername,
            authorId: comment.author.toString(),
            isAnonymous: comment.isAnonymous,
            createdAt: comment.createdAt.toISOString()
          })),
          createdAt: gossip.createdAt.toISOString()
        };
      })
    );

    res.json({ success: true, gossips: gossipsWithComments });
  } catch (error) {
    console.error('❌ GET GOSSIPS ERROR:', error);
    res.status(500).json({ success: false, message: 'Error fetching gossips' });
  }
});

// POST /api/gossips - Create new gossip
router.post('/', async (req, res) => {
  try {
    const { content, authorId, authorUsername, isAnonymous } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gossip content is required' 
      });
    }

    const gossip = new Gossip({
      content: content.trim(),
      author: authorId,
      authorUsername,
      isAnonymous: isAnonymous || false,
      upvotedBy: [],
      downvotedBy: []
    });

    await gossip.save();

    res.status(201).json({
      success: true,
      gossip: {
        id: gossip._id.toString(),
        content: gossip.content,
        author: gossip.isAnonymous ? 'Anonymous' : gossip.authorUsername,
        authorId: gossip.author.toString(),
        isAnonymous: gossip.isAnonymous,
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        comments: [],
        createdAt: gossip.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ CREATE GOSSIP ERROR:', error);
    res.status(500).json({ success: false, message: 'Error creating gossip' });
  }
});

// POST /api/gossips/:id/vote - Upvote or downvote
router.post('/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, voteType } = req.body; // voteType: 'up' or 'down'

    const gossip = await Gossip.findById(id);
    if (!gossip) {
      return res.status(404).json({ success: false, message: 'Gossip not found' });
    }

    // Remove from both arrays first
    gossip.upvotedBy = gossip.upvotedBy.filter(uid => uid.toString() !== userId);
    gossip.downvotedBy = gossip.downvotedBy.filter(uid => uid.toString() !== userId);

    // Add to appropriate array
    if (voteType === 'up') {
      gossip.upvotedBy.push(userId);
    } else if (voteType === 'down') {
      gossip.downvotedBy.push(userId);
    }

    await gossip.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('gossip-updated', {
      gossipId: id,
      upvotes: gossip.upvotedBy.length,
      downvotes: gossip.downvotedBy.length
    });

    res.json({ 
      success: true,
      upvotes: gossip.upvotedBy.length,
      downvotes: gossip.downvotedBy.length
    });
  } catch (error) {
    console.error('❌ VOTE ERROR:', error);
    res.status(500).json({ success: false, message: 'Error voting' });
  }
});

// POST /api/gossips/:id/comments - Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, authorId, authorUsername, isAnonymous } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment content is required' 
      });
    }

    const comment = new GossipComment({
      gossipId: id,
      content: content.trim(),
      author: authorId,
      authorUsername,
      isAnonymous: isAnonymous || false
    });

    await comment.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('gossip-comment-added', { gossipId: id });

    res.status(201).json({
      success: true,
      comment: {
        id: comment._id.toString(),
        content: comment.content,
        author: comment.isAnonymous ? 'Anonymous' : comment.authorUsername,
        authorId: comment.author.toString(),
        isAnonymous: comment.isAnonymous,
        createdAt: comment.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ ADD COMMENT ERROR:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});

// DELETE /api/gossips/:id - Delete gossip (admin or author)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const gossip = await Gossip.findById(id);
    if (!gossip) {
      return res.status(404).json({ success: false, message: 'Gossip not found' });
    }

    // Check if user is admin or author
    if (userId !== 'admin_001' && gossip.author.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this gossip' 
      });
    }

    await Promise.all([
      Gossip.findByIdAndDelete(id),
      GossipComment.deleteMany({ gossipId: id })
    ]);

    // Emit socket event
    const io = req.app.get('io');
    io.emit('gossip-deleted', { gossipId: id });

    res.json({ success: true, message: 'Gossip deleted' });
  } catch (error) {
    console.error('❌ DELETE GOSSIP ERROR:', error);
    res.status(500).json({ success: false, message: 'Error deleting gossip' });
  }
});

export default router;
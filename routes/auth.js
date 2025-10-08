// import express from 'express';
// import { User } from '../models/index.js';

// const router = express.Router();

// // POST /api/auth/login - User/Admin login
// router.post('/login', async (req, res) => {
//   try {
//     const { username, password, isAdmin } = req.body;

//     if (isAdmin) {
//       // Admin login
//       console.log('🔐 ADMIN LOGIN ATTEMPT:', username);
//       if (
//         username === process.env.ADMIN_USERNAME && 
//         password === process.env.ADMIN_PASSWORD
//       ) {
//         console.log('✅ ADMIN LOGIN SUCCESSFUL:', username);
//         return res.json({
//           success: true,
//           user: {
//             id: 'admin_001',
//             username: process.env.ADMIN_USERNAME,
//             isAdmin: true
//           },
//           message: 'Admin login successful'
//         });
//       }
//       console.log('❌ ADMIN LOGIN FAILED:', username);
//       return res.status(401).json({ 
//         success: false, 
//         message: 'Invalid admin credentials' 
//       });
//     } else {
//       // Regular user login/signup
//       console.log('👤 USER LOGIN ATTEMPT:', username);
//       let user = await User.findOne({ username });
      
//       if (!user) {
//         // Create new user if doesn't exist
//         console.log('🆕 CREATING NEW USER:', username);
//         user = new User({ username });
//         await user.save();
//         console.log('✅ NEW USER CREATED:', username, '| ID:', user._id);
//       } else {
//         console.log('✅ EXISTING USER LOGGED IN:', username, '| ID:', user._id);
//       }
      
//       return res.json({
//         success: true,
//         user: {
//           id: user._id.toString(),
//           username: user.username,
//           isAdmin: false
//         }
//       });
//     }
//   } catch (error) {
//     console.error('❌ LOGIN ERROR:', error);
    
//     if (error.code === 11000) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Username already exists' 
//       });
//     }
    
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error during login' 
//     });
//   }
// });

// export default router;
import express from 'express';
import { User } from '../models/index.js';

const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('📝 USER REGISTRATION ATTEMPT:', username);

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('❌ REGISTRATION FAILED: Username already exists');
      return res.status(400).json({ 
        success: false, 
        message: 'Username already taken' 
      });
    }

    // Create new user
    const user = new User({ username, password });
    await user.save();

    console.log('✅ NEW USER REGISTERED:', username, '| ID:', user._id);

    return res.status(201).json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        isAdmin: false
      },
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('❌ REGISTRATION ERROR:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// POST /api/auth/login - User/Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;

    if (isAdmin) {
      // Admin login
      console.log('🔐 ADMIN LOGIN ATTEMPT:', username);
      if (
        username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD
      ) {
        console.log('✅ ADMIN LOGIN SUCCESSFUL:', username);
        return res.json({
          success: true,
          user: {
            id: 'admin_001',
            username: process.env.ADMIN_USERNAME,
            isAdmin: true
          },
          message: 'Admin login successful'
        });
      }
      console.log('❌ ADMIN LOGIN FAILED:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin credentials' 
      });
    } else {
      // Regular user login
      console.log('👤 USER LOGIN ATTEMPT:', username);

      // Validation
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username and password are required' 
        });
      }

      // Find user
      const user = await User.findOne({ username });
      
      if (!user) {
        console.log('❌ LOGIN FAILED: User not found');
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        console.log('❌ LOGIN FAILED: Invalid password');
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }

      console.log('✅ USER LOGGED IN:', username, '| ID:', user._id);
      
      return res.json({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          isAdmin: false
        },
        message: 'Login successful'
      });
    }
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

export default router;
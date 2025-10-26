

// // working
// import express from 'express';
// import { User } from '../models/index.js';

// const router = express.Router();

// // POST /api/auth/register - User registration
// router.post('/register', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     console.log('📝 USER REGISTRATION ATTEMPT:', username);

//     // Validation
//     if (!username || !password) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Username and password are required' 
//       });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Password must be at least 6 characters' 
//       });
//     }

//     // Check if user exists
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       console.log('❌ REGISTRATION FAILED: Username already exists');
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Username already taken' 
//       });
//     }

//     // Create new user
//     const user = new User({ username, password });
//     await user.save();

//     console.log('✅ NEW USER REGISTERED:', username, '| ID:', user._id);

//     return res.status(201).json({
//       success: true,
//       user: {
//         id: user._id.toString(),
//         username: user.username,
//         isAdmin: false
//       },
//       message: 'Registration successful'
//     });
//   } catch (error) {
//     console.error('❌ REGISTRATION ERROR:', error);
    
//     if (error.code === 11000) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Username already exists' 
//       });
//     }
    
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error during registration' 
//     });
//   }
// });

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
//       // Regular user login
//       console.log('👤 USER LOGIN ATTEMPT:', username);

//       // Validation
//       if (!username || !password) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Username and password are required' 
//         });
//       }

//       // Find user
//       const user = await User.findOne({ username });
      
//       if (!user) {
//         console.log('❌ LOGIN FAILED: User not found');
//         return res.status(401).json({ 
//           success: false, 
//           message: 'Invalid username or password' 
//         });
//       }

//       // Check password
//       const isPasswordValid = await user.comparePassword(password);
      
//       if (!isPasswordValid) {
//         console.log('❌ LOGIN FAILED: Invalid password');
//         return res.status(401).json({ 
//           success: false, 
//           message: 'Invalid username or password' 
//         });
//       }

//       console.log('✅ USER LOGGED IN:', username, '| ID:', user._id);
      
//       return res.json({
//         success: true,
//         user: {
//           id: user._id.toString(),
//           username: user.username,
//           isAdmin: false
//         },
//         message: 'Login successful'
//       });
//     }
//   } catch (error) {
//     console.error('❌ LOGIN ERROR:', error);
    
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

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already exists' 
        });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered' 
        });
      }
    }

    // Create user
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      isAdmin: false
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('❌ REGISTER ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating account' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email/username and password are required' 
      });
    }

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername }
      ]
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error logging in' 
    });
  }
});

// Get user by ID
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('❌ GET USER ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user' 
    });
  }
});

export default router;
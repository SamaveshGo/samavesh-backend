import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'samavesh_jwt_secret_token_123_456';

// Helper to determine if a string is a phone number
const isPhone = (val: string): boolean => {
  return /^[+]?[0-9\s-]{7,15}$/.test(val);
};

// Helper to validate email format
const isEmail = (val: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, emailOrId, password, role } = req.body;

    if (!name || !password || !role) {
      res.status(400).json({ success: false, message: 'Name, password, and role are required' });
      return;
    }

    if (!['controller', 'driver', 'commuter'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const userData: any = {
      name,
      role,
    };

    if (role === 'driver') {
      const driverEmail = (email || emailOrId || '').trim().toLowerCase();
      const driverPhone = (phone || '').trim();

      if (!driverEmail || !driverPhone) {
        res.status(400).json({ success: false, message: 'Email and mobile number are required for driver signup' });
        return;
      }

      if (!isEmail(driverEmail)) {
        res.status(400).json({ success: false, message: 'Invalid email format' });
        return;
      }

      if (!isPhone(driverPhone)) {
        res.status(400).json({ success: false, message: 'Invalid mobile number format' });
        return;
      }

      const existingEmail = await User.findOne({ email: driverEmail });
      if (existingEmail) {
        res.status(400).json({ success: false, message: 'Email is already registered' });
        return;
      }

      const existingPhone = await User.findOne({ phone: driverPhone });
      if (existingPhone) {
        res.status(400).json({ success: false, message: 'Mobile number is already registered' });
        return;
      }

      userData.email = driverEmail;
      userData.phone = driverPhone;
    } else if (role === 'controller') {
      const ctrlEmail = (email || emailOrId || '').trim().toLowerCase();
      if (!ctrlEmail || !isEmail(ctrlEmail)) {
        res.status(400).json({ success: false, message: 'Valid email is required for controller' });
        return;
      }
      const existingUser = await User.findOne({ email: ctrlEmail });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'Email is already registered' });
        return;
      }
      userData.email = ctrlEmail;
    } else if (role === 'commuter') {
      const identifier = (email || phone || emailOrId || '').trim();
      if (!identifier) {
        res.status(400).json({ success: false, message: 'Email or phone number is required' });
        return;
      }

      if (isPhone(identifier)) {
        userData.phone = identifier;
        const existingUser = await User.findOne({ phone: identifier });
        if (existingUser) {
          res.status(400).json({ success: false, message: 'Mobile number is already registered' });
          return;
        }
      } else if (isEmail(identifier)) {
        const commEmail = identifier.toLowerCase();
        userData.email = commEmail;
        const existingUser = await User.findOne({ email: commEmail });
        if (existingUser) {
          res.status(400).json({ success: false, message: 'Email is already registered' });
          return;
        }
      } else {
        res.status(400).json({ success: false, message: 'Invalid email or mobile number format' });
        return;
      }
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new User(userData);
    await newUser.save();

    // Sign JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
        phone: newUser.phone,
        employeeId: newUser.employeeId,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, emailOrId, phone, password, role } = req.body;

    if (!password || !role) {
      res.status(400).json({ success: false, message: 'Password and role are required' });
      return;
    }

    let query: any = { role };

    if (role === 'driver') {
      const driverEmail = (email || emailOrId || '').trim().toLowerCase();
      if (!driverEmail || !isEmail(driverEmail)) {
        res.status(400).json({ success: false, message: 'Valid email is required for driver login' });
        return;
      }
      query.email = driverEmail;
    } else if (role === 'controller') {
      const ctrlEmail = (email || emailOrId || '').trim().toLowerCase();
      if (!ctrlEmail || !isEmail(ctrlEmail)) {
        res.status(400).json({ success: false, message: 'Valid email is required' });
        return;
      }
      query.email = ctrlEmail;
    } else if (role === 'commuter') {
      const identifier = (email || phone || emailOrId || '').trim();
      if (!identifier) {
        res.status(400).json({ success: false, message: 'Email or phone number is required' });
        return;
      }

      if (isPhone(identifier)) {
        query.phone = identifier;
      } else {
        query.email = identifier.toLowerCase();
      }
    } else {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const user = await User.findOne(query);
    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

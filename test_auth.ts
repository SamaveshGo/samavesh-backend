import mongoose from 'mongoose';
import User from './src/models/User';

const BACKEND_URL = 'http://localhost:5001/api';

const runTests = async () => {
  console.log('--- STARTING AUTHENTICATION API TESTS ---');

  // 1. Connect to DB to clear any existing test accounts
  console.log('Connecting to database...');
  await mongoose.connect('process.env.MONGODB_URI' in process.env ? process.env.MONGODB_URI! : 'mongodb://localhost:27017/samavesh');
  console.log('Cleaning up old test users...');
  await User.deleteMany({
    $or: [
      { email: 'ramesh.driver@best.org' },
      { phone: '9876543210' },
      { email: 'controller@best.org' },
      { email: 'priya.mehta@gmail.com' }
    ]
  });
  await mongoose.disconnect();
  console.log('DB cleanup done.');

  // Helper to make API requests
  const apiCall = async (path: string, method: string, body?: any, token?: string) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json() as any };
  };

  // Test 1: Health check
  console.log('\nTesting Health Endpoint...');
  const health = await apiCall('/health', 'GET');
  console.log('Health Response:', health);
  if (health.status !== 200) throw new Error('Health check failed');

  // Test 2: Controller Signup
  console.log('\nTesting Controller Signup...');
  const controllerSignup = await apiCall('/auth/signup', 'POST', {
    name: 'BEST Controller',
    emailOrId: 'controller@best.org',
    password: 'password123',
    role: 'controller'
  });
  console.log('Controller Signup Status:', controllerSignup.status);
  console.log('Controller Signup Data:', controllerSignup.data);
  if (controllerSignup.status !== 201 || !controllerSignup.data.token) {
    throw new Error('Controller signup failed');
  }

  // Test 3: Controller Login
  console.log('\nTesting Controller Login...');
  const controllerLogin = await apiCall('/auth/login', 'POST', {
    emailOrId: 'controller@best.org',
    password: 'password123',
    role: 'controller'
  });
  console.log('Controller Login Status:', controllerLogin.status);
  if (controllerLogin.status !== 200 || !controllerLogin.data.token) {
    throw new Error('Controller login failed');
  }
  const controllerToken = controllerLogin.data.token;

  // Test 4: Driver Signup
  console.log('\nTesting Driver Signup...');
  const driverSignup = await apiCall('/auth/signup', 'POST', {
    name: 'Ramesh Kumar',
    email: 'ramesh.driver@best.org',
    phone: '9876543210',
    password: 'password123',
    role: 'driver'
  });
  console.log('Driver Signup Status:', driverSignup.status);
  console.log('Driver Signup Data:', driverSignup.data);
  if (driverSignup.status !== 201) throw new Error('Driver signup failed');

  // Test 5: Driver Login
  console.log('\nTesting Driver Login...');
  const driverLogin = await apiCall('/auth/login', 'POST', {
    email: 'ramesh.driver@best.org',
    password: 'password123',
    role: 'driver'
  });
  console.log('Driver Login Status:', driverLogin.status);
  if (driverLogin.status !== 200) throw new Error('Driver login failed');

  // Test 6: Commuter Signup
  console.log('\nTesting Commuter Signup...');
  const commuterSignup = await apiCall('/auth/signup', 'POST', {
    name: 'Priya Mehta',
    emailOrId: 'priya.mehta@gmail.com',
    password: 'password123',
    role: 'commuter'
  });
  console.log('Commuter Signup Status:', commuterSignup.status);
  console.log('Commuter Signup Data:', commuterSignup.data);
  if (commuterSignup.status !== 201) throw new Error('Commuter signup failed');

  // Test 7: Commuter Login
  console.log('\nTesting Commuter Login...');
  const commuterLogin = await apiCall('/auth/login', 'POST', {
    emailOrId: 'priya.mehta@gmail.com',
    password: 'password123',
    role: 'commuter'
  });
  console.log('Commuter Login Status:', commuterLogin.status);
  if (commuterLogin.status !== 200) throw new Error('Commuter login failed');

  // Test 8: Protected Route (/auth/me) with token
  console.log('\nTesting Protected Route with valid token...');
  const protectedMe = await apiCall('/auth/me', 'GET', undefined, controllerToken);
  console.log('Protected Me Response:', protectedMe.data);
  if (protectedMe.status !== 200 || protectedMe.data.user.role !== 'controller') {
    throw new Error('Protected route check failed');
  }

  // Test 9: Protected Route without token
  console.log('\nTesting Protected Route without token...');
  const unauthorizedMe = await apiCall('/auth/me', 'GET');
  console.log('Unauthorized Me Response:', unauthorizedMe);
  if (unauthorizedMe.status !== 401) {
    throw new Error('Expected 401 Unauthorized but got something else');
  }

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
};

runTests().catch(err => {
  console.error('\n!!! TEST RUN FAILED !!!');
  console.error(err);
  process.exit(1);
});

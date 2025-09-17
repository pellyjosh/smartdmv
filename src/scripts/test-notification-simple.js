#!/usr/bin/env node

const http = require('http');

async function testNotification() {
  try {
    console.log('🧪 Testing notification creation...');
    
    const data = JSON.stringify({
      userId: 3,
      practiceId: 1,
      title: 'Test Real-time Notification',
      message: 'This is a test notification to verify real-time popups are working! 🎉',
      type: 'info'
    });

    const options = {
      hostname: 'localhost',
      port: 9002,
      path: '/api/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Notification created successfully:', JSON.parse(body));
          console.log('🔔 Check your browser for a real-time popup!');
        } else {
          console.error('❌ Failed to create notification:', res.statusCode, body);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error testing notification:', error.message);
    });

    req.write(data);
    req.end();
  } catch (error) {
    console.error('❌ Error testing notification:', error.message);
  }
}

// Run the test
testNotification();

#!/usr/bin/env node

const http = require('http');

async function testNotificationMarkAsRead() {
  console.log('🧪 Testing notification mark as read functionality...');
  
  try {
    // Test 1: Create a test notification
    console.log('\n📝 Step 1: Creating a test notification...');
    const createData = JSON.stringify({
      userId: 3,
      practiceId: 1,
      title: 'Test Mark As Read Notification',
      message: 'This notification will be used to test mark as read functionality.',
      type: 'info'
    });

    const createResult = await makeRequest('POST', '/api/notifications', createData);
    console.log('✅ Test notification created:', createResult);

    // Test 2: Fetch notifications to find unread ones
    console.log('\n📝 Step 2: Fetching notifications...');
    const fetchResult = await makeRequest('GET', '/api/notifications?userId=3&practiceId=1&limit=10');
    console.log('📄 Current notifications:', fetchResult.notifications?.map(n => ({
      id: n.id,
      title: n.title,
      read: n.read
    })));

    const unreadNotifications = fetchResult.notifications?.filter(n => !n.read) || [];
    console.log('🔔 Unread notifications count:', unreadNotifications.length);

    if (unreadNotifications.length > 0) {
      // Test 3: Mark one notification as read
      const firstUnread = unreadNotifications[0];
      console.log(`\n📝 Step 3: Marking notification ${firstUnread.id} as read...`);
      
      const markOneResult = await makeRequest('PATCH', `/api/notifications?id=${firstUnread.id}`);
      console.log('✅ Mark as read result:', markOneResult);

      // Test 4: Verify it was marked as read
      console.log('\n📝 Step 4: Verifying notification was marked as read...');
      const verifyResult = await makeRequest('GET', '/api/notifications?userId=3&practiceId=1&limit=10');
      const updatedNotification = verifyResult.notifications?.find(n => n.id === firstUnread.id);
      console.log('✅ Updated notification read status:', updatedNotification?.read);

      // Test 5: Mark all notifications as read
      console.log('\n📝 Step 5: Marking all notifications as read...');
      const markAllResult = await makeRequest('PATCH', '/api/notifications?markAllRead=true');
      console.log('✅ Mark all as read result:', markAllResult);

      // Test 6: Verify all are marked as read
      console.log('\n📝 Step 6: Verifying all notifications are marked as read...');
      const finalResult = await makeRequest('GET', '/api/notifications?userId=3&practiceId=1&limit=10');
      const stillUnread = finalResult.notifications?.filter(n => !n.read) || [];
      console.log('📄 Remaining unread notifications:', stillUnread.length);
      
      if (stillUnread.length === 0) {
        console.log('🎉 SUCCESS: All notifications are now marked as read!');
      } else {
        console.log('❌ Some notifications are still unread:', stillUnread.map(n => ({ id: n.id, title: n.title })));
      }
    } else {
      console.log('ℹ️  No unread notifications found to test with.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real environment, you'd need proper authentication cookies
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Run the test
testNotificationMarkAsRead();

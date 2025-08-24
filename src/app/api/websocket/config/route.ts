import { NextRequest, NextResponse } from 'next/server';

// Since we can't directly access the WebSocket server instance from the API route,
// we'll create a simple endpoint that returns basic info about WebSocket configuration
export async function GET(request: NextRequest) {
  try {
    // Basic WebSocket configuration info
    const config = {
      endpoint: '/ws',
      services: [
        {
          name: 'Whiteboard',
          messageTypes: ['whiteboard_update'],
          enabled: true
        },
        {
          name: 'Telemedicine', 
          messageTypes: [
            'telemedicine_offer',
            'telemedicine_answer',
            'telemedicine_ice_candidate',
            'telemedicine_user_joined',
            'telemedicine_user_left',
            'telemedicine_chat_message'
          ],
          enabled: true
        }
      ],
      serverStatus: 'running', // This would need to be dynamically checked in a real implementation
      port: process.env.PORT || 9002
    };

    return NextResponse.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting WebSocket config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get WebSocket configuration' 
      },
      { status: 500 }
    );
  }
}

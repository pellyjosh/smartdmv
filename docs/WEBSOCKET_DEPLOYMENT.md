# WebSocket Server Deployment Guide

Your WebSocket server needs to be deployed separately from the Next.js app since Amplify is designed for static/serverless apps, not persistent WebSocket connections.

## Option 1: AWS ECS (Recommended)

### Prerequisites

- Docker installed locally
- AWS CLI configured

### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose WebSocket port
EXPOSE 8080

# Start WebSocket server
CMD ["npm", "run", "ws"]
```

### Step 2: Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name smartdmv-websocket

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t smartdmv-websocket .

# Tag image
docker tag smartdmv-websocket:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/smartdmv-websocket:latest

# Push image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/smartdmv-websocket:latest
```

### Step 3: Create ECS Service

1. **Create Task Definition**

   - Use the ECR image URI
   - Set environment variables (POSTGRES_URL, etc.)
   - Configure port mapping: 8080

2. **Create ECS Service**
   - Use Fargate launch type
   - Configure Application Load Balancer
   - Set up health checks

## Option 2: AWS EC2 (Simple)

### Step 1: Launch EC2 Instance

```bash
# Launch Ubuntu instance
# Configure security group to allow port 8080
```

### Step 2: Setup on EC2

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/pellyjosh/smartdmv.git
cd smartdmv

# Install dependencies
npm ci

# Install PM2 for process management
sudo npm install -g pm2

# Set environment variables
echo "POSTGRES_URL=your-postgres-url" > .env
echo "NODE_ENV=production" >> .env

# Start WebSocket server with PM2
pm2 start "npm run ws" --name websocket-server

# Make PM2 restart on reboot
pm2 startup
pm2 save
```

### Step 3: Configure Load Balancer

1. **Create Application Load Balancer**

   - Target type: Instance
   - Protocol: HTTP, Port: 8080
   - Health check path: `/health` (if you have one)

2. **SSL Certificate**
   - Request certificate in ACM
   - Attach to load balancer

## Option 3: AWS Lambda (Serverless WebSocket)

For a serverless approach, you can use API Gateway WebSocket APIs with Lambda:

### WebSocket Lambda Handler

```javascript
// websocket-handler.js
exports.handler = async (event) => {
  const { requestContext } = event;
  const { connectionId, routeKey } = requestContext;

  // Handle WebSocket connections
  switch (routeKey) {
    case "$connect":
      // Handle new connection
      break;
    case "$disconnect":
      // Handle disconnection
      break;
    case "message":
      // Handle messages
      break;
  }
};
```

## Environment Variables for WebSocket Server

```bash
POSTGRES_URL=postgresql://smartdvm:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm?sslmode=require
NODE_ENV=production
PORT=8080
```

## Connecting from Next.js App

Update your client-side WebSocket connection:

```javascript
// In your Next.js app
const wsUrl =
  process.env.NODE_ENV === "production"
    ? "wss://your-websocket-domain.com"
    : "ws://localhost:8080";

const socket = new WebSocket(wsUrl);
```

## Domain Setup

1. **Create subdomain**: `ws.yourdomain.com`
2. **Point to load balancer**: Create CNAME record
3. **SSL**: Use ACM certificate on load balancer

## Monitoring & Scaling

- **CloudWatch**: Monitor CPU, memory, connections
- **Auto Scaling**: Scale based on connection count
- **Health Checks**: Implement `/health` endpoint
- **Logs**: Use CloudWatch Logs for debugging

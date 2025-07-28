# Brello API Documentation

## Base URL
```
http://localhost:4000
```

## Authentication
All endpoints except `/auth` require authentication using JWT token.

### Headers
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication
#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "fullname": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** `201 Created`
```json
{
  "token": "string"
}
```

#### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "token": "string"
}
```

### Users
#### GET /user/me
Get current user profile.

**Response:** `200 OK`
```json
{
  "fullname": "string",
  "email": "string",
  "avatar": "string",
  "lastBoardVisited": [
    {
      "id": "string",
      "boardStyle": {
        "boardType": "color" | "image",
        "boardColor": "string",
        "boardImg": "string"
      },
      "boardTitle": "string"
    }
  ],
  "starredBoards": [
    {
      "id": "string",
      "boardTitle": "string",
      "boardStyle": {
        "boardType": "color" | "image",
        "boardColor": "string",
        "boardImg": "string"
      },
      "isStarred": true
    }
  ]
}
```

#### PUT /user/me
Update user preferences.

**Request Body:**
```json
{
  "lastBoardVisited": "string",
  "starredBoards": {
    "board": "string",
    "isStarred": "boolean"
  }
}
```

### Boards
#### POST /board
Create a new board.

**Request Body:**
```json
{
  "boardTitle": "string",
  "boardStyle": {
    "boardType": "color" | "image",
    "boardColor": "string",
    "boardImg": "string"
  }
}
```

#### GET /board/:id
Get board details with lists and tasks.

**Response:** `200 OK`
```json
{
  "board": {
    "boardTitle": "string",
    "boardStyle": {
      "boardType": "color" | "image",
      "boardColor": "string",
      "boardImg": "string"
    },
    "boardLabels": [
      {
        "color": "string",
        "title": "string"
      }
    ],
    "boardMembers": [
      {
        "_id": "string",
        "fullname": "string",
        "avatar": "string"
      }
    ]
  },
  "lists": [...],
  "tasks": [...]
}
```

### Lists
#### POST /list
Create a new list in a board.

**Request Body:**
```json
{
  "taskListBoard": "string",
  "taskListTitle": "string",
  "indexInBoard": "number"
}
```

#### PUT /list/:id
Update list details.

**Request Body:**
```json
{
  "taskListTitle": "string",
  "taskList": ["string"]
}
```

### Tasks
#### POST /tasks
Create a new task.

**Request Body:**
```json
{
  "listId": "string",
  "title": "string",
  "position": "number",
  "description": "string",
  "labels": ["string"],
  "members": ["string"],
  "checklist": [
    {
      "title": "string",
      "items": [
        {
          "text": "string",
          "done": "boolean"
        }
      ]
    }
  ],
  "cover": {
    "coverType": "color" | "image",
    "coverColor": "string",
    "coverImg": "string"
  }
}
```

#### PUT /tasks/:id
Update task details.

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "labels": ["string"],
  "members": ["string"],
  "startDate": "string",
  "dueDate": "string",
  "checklist": [...],
  "cover": {...},
  "position": "number",
  "isWatching": "boolean",
  "isDueComplete": "boolean"
}
```

### Activities
#### GET /activities/:taskId
Get activity history for a task.

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "userId": "string",
    "userName": "string",
    "userAvatar": "string",
    "entityId": "string",
    "action": "string",
    "payload": "object",
    "createdAt": "string"
  }
]
```

### Templates
#### POST /boards/template/:templateId
Create a new board from template.

**Request Body:**
```json
{
  "title": "string"
}
```

### AI-Powered Boards
#### POST /autoBoard
Create a new board using AI generation.

**Request Body:**
```json
{
  "prompt": "string"
}
```

**Response:** `201 Created`
```json
{
  "boardId": "string"
}
```

## Real-time Updates
The API uses Socket.IO for real-time updates. Events include:

- `taskCreated`: Emitted when a new task is created
- `taskUpdated`: Emitted when a task is modified
- `taskDeleted`: Emitted when a task is deleted

Connect to WebSocket endpoint using:
```javascript
const socket = io('http://localhost:4000', {
  transports: ['websocket'],
  credentials: true
});
```

## Error Responses
All endpoints may return the following error responses:

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "string"
}
```

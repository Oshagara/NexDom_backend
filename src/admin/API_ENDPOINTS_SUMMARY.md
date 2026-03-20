# Activity Tracking & Profile API Endpoints

This document summarizes the backend endpoints implemented for the activity tracking and profile system.

## Activity Tracking Endpoints

### POST /activity/batch
**Purpose**: Batch log multiple activity events
**Authentication**: JWT required
**Request Body**:
```json
{
  "events": [
    {
      "userId": "string",
      "role": "admin|agent|landlord|tenant",
      "action": "string",
      "resource": "string",
      "resourceId": "string (optional)",
      "metadata": "object (optional)",
      "ip": "string (optional)",
      "userAgent": "string (optional)",
      "sessionId": "string (optional)",
      "timestamp": "Date (optional)"
    }
  ]
}
```
**Response**:
```json
{
  "message": "Activity events logged successfully",
  "count": 5,
  "events": [...]
}
```

### GET /activity
**Purpose**: Get user activity with filtering and pagination
**Authentication**: JWT required
**Query Parameters**:
- `userId` (optional): Filter by user ID
- `role` (optional): Filter by role
- `action` (optional): Filter by action
- `resource` (optional): Filter by resource
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field
- `sortOrder` (optional): "asc" or "desc"

### GET /activity/recent
**Purpose**: Get recent activity for current user
**Authentication**: JWT required
**Query Parameters**:
- `limit` (optional): Number of recent activities (default: 10, max: 50)

### GET /activity/stats
**Purpose**: Get activity statistics (admin only)
**Authentication**: JWT + Admin role required
**Query Parameters**: Same as GET /activity

### POST /activity/cleanup
**Purpose**: Clean up old activity records (superadmin only)
**Authentication**: JWT + Superadmin role required
**Request Body**:
```json
{
  "daysToKeep": 90
}
```

## Profile Endpoints

### Admin Profiles

#### GET /admin/:id
**Purpose**: Get admin profile by ID
**Authentication**: JWT + Admin role required
**Response**:
```json
{
  "id": "string",
  "adminId": "string",
  "name": "string",
  "email": "string",
  "role": "string",
  "status": "string",
  "lastLoginAt": "Date",
  "lastLoginIp": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Agent Profiles

#### GET /users/agent/:id
**Purpose**: Get agent profile by ID
**Authentication**: JWT required
**Access Control**: 
- Admins can see detailed profile
- Agents can see their own detailed profile
- Others can see basic profile only

#### GET /users/agent
**Purpose**: Get all agents with pagination (admin only)
**Authentication**: JWT + Admin role required
**Query Parameters**: Standard pagination and filtering

#### GET /users/agent/stats/summary
**Purpose**: Get agent statistics (admin only)
**Authentication**: JWT + Admin role required

### Landlord Profiles

#### GET /landlord/:id
**Purpose**: Get landlord profile by ID
**Authentication**: JWT required
**Access Control**:
- Admins can see detailed profile
- Landlords can see their own detailed profile
- Others can see basic profile only

#### GET /landlord
**Purpose**: Get all landlords with pagination (admin only)
**Authentication**: JWT + Admin role required
**Query Parameters**: Standard pagination and filtering

#### GET /landlord/stats/summary
**Purpose**: Get landlord statistics (admin only)
**Authentication**: JWT + Admin role required

## Frontend Integration

The frontend can now use these endpoints to:

1. **Track Activities**: Use `POST /activity/batch` to log user actions
2. **Display Timelines**: Use `GET /activity` and `GET /activity/recent` for activity feeds
3. **Show Profiles**: Use the profile endpoints to display user information
4. **Admin Dashboards**: Use stats endpoints for analytics

## Example Frontend Usage

```javascript
// Log activity events
const logActivity = async (events) => {
  const response = await fetch('/activity/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ events })
  });
  return response.json();
};

// Get user activity
const getUserActivity = async (userId, role) => {
  const response = await fetch(`/activity?userId=${userId}&role=${role}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Get profile
const getProfile = async (role, id) => {
  const endpoint = role === 'agent' ? `/users/agent/${id}` : 
                  role === 'landlord' ? `/landlord/${id}` : 
                  `/admin/${id}`;
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

## Database Schemas

### Activity Schema
- Tracks user actions with metadata
- Indexed for efficient querying by userId, role, action, resource, and timestamp
- Supports batch operations

### Landlord Schema
- Comprehensive landlord profile with business information
- Includes contact details, preferences, and verification status
- Indexed for efficient searching and filtering

### Agent Schema (Users Collection)
- Agents are stored in the existing users collection
- Enhanced with agent-specific fields like agencyName and agentId
- Maintains compatibility with existing user system
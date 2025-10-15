# User Profile API Endpoints

This document describes how to use the user profile API endpoints for the AI Nutritionist application.

## Base URL

```
/api/user
```

## Endpoints

### 1. GET User Profile

Retrieve a user profile by userId.

**URL:** `GET /api/user?userId={userId}`

**Parameters:**

- `userId` (query parameter, required): The unique identifier for the user

**Response:**

```json
{
  "userId": "user123",
  "age": 25,
  "gender": "female",
  "goals": ["weight_loss", "muscle_gain"],
  "allergies": ["nuts", "dairy"],
  "budget": {
    "min": 50,
    "max": 200,
    "currency": "USD"
  },
  "lastInteraction": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**

- `400`: Missing userId parameter
- `404`: User profile not found
- `503`: Database connection failed
- `500`: Internal server error

### 2. POST User Profile

Create a new user profile or update an existing one.

**URL:** `POST /api/user`

**Request Body:**

```json
{
  "userId": "user123",
  "age": 25,
  "gender": "female",
  "goals": ["weight_loss", "muscle_gain"],
  "allergies": ["nuts", "dairy"],
  "budget": {
    "min": 50,
    "max": 200,
    "currency": "USD"
  }
}
```

**Required Fields:**

- `userId`: Unique identifier for the user
- `age`: User's age (1-120)
- `gender`: One of "male", "female", "other", "prefer-not-to-say"
- `budget.min`: Minimum budget amount (non-negative)
- `budget.max`: Maximum budget amount (non-negative, >= min)

**Optional Fields:**

- `goals`: Array of strings (max 10 items)
- `allergies`: Array of strings (max 20 items)
- `budget.currency`: Currency code (defaults to "USD")

**Response:**

- `201`: Profile created successfully
- `200`: Profile updated successfully

**Error Responses:**

- `400`: Validation error (invalid data)
- `409`: User profile already exists (duplicate userId)
- `503`: Database connection failed
- `500`: Internal server error

### 3. PUT User Profile

Update specific fields of an existing user profile.

**URL:** `PUT /api/user?userId={userId}`

**Parameters:**

- `userId` (query parameter, required): The unique identifier for the user

**Request Body:** (Only include fields you want to update)

```json
{
  "age": 26,
  "goals": ["weight_loss", "muscle_gain", "better_sleep"],
  "budget": {
    "min": 75,
    "max": 250,
    "currency": "USD"
  }
}
```

**Response:**

- `200`: Profile updated successfully

**Error Responses:**

- `400`: Missing userId or validation error
- `404`: User profile not found
- `503`: Database connection failed
- `500`: Internal server error

### 4. DELETE User Profile

Delete a user profile.

**URL:** `DELETE /api/user?userId={userId}`

**Parameters:**

- `userId` (query parameter, required): The unique identifier for the user

**Response:**

```json
{
  "message": "User profile deleted successfully"
}
```

**Error Responses:**

- `400`: Missing userId parameter
- `404`: User profile not found
- `503`: Database connection failed
- `500`: Internal server error

## Example Usage

### JavaScript/Fetch

```javascript
// Create a new user profile
const createProfile = async () => {
  const response = await fetch("/api/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: "user123",
      age: 25,
      gender: "female",
      goals: ["weight_loss", "muscle_gain"],
      allergies: ["nuts", "dairy"],
      budget: {
        min: 50,
        max: 200,
        currency: "USD",
      },
    }),
  });

  const profile = await response.json();
  console.log(profile);
};

// Get user profile
const getProfile = async (userId) => {
  const response = await fetch(`/api/user?userId=${userId}`);
  const profile = await response.json();
  console.log(profile);
};

// Update user profile
const updateProfile = async (userId, updates) => {
  const response = await fetch(`/api/user?userId=${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const profile = await response.json();
  console.log(profile);
};
```

### cURL Examples

```bash
# Create user profile
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "age": 25,
    "gender": "female",
    "goals": ["weight_loss", "muscle_gain"],
    "allergies": ["nuts", "dairy"],
    "budget": {
      "min": 50,
      "max": 200,
      "currency": "USD"
    }
  }'

# Get user profile
curl "http://localhost:3000/api/user?userId=user123"

# Update user profile
curl -X PUT "http://localhost:3000/api/user?userId=user123" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 26,
    "goals": ["weight_loss", "muscle_gain", "better_sleep"]
  }'

# Delete user profile
curl -X DELETE "http://localhost:3000/api/user?userId=user123"
```

## Database Requirements

Make sure to set the `MONGODB_URI` environment variable:

```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-nutritionist

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-nutritionist
```

## Notes

- All timestamps are in ISO 8601 format
- The `lastInteraction` field is automatically updated when profiles are modified
- Goals and allergies arrays have maximum limits (10 and 20 respectively)
- Budget amounts must be non-negative numbers
- The API automatically handles database connection management

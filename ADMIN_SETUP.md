# Admin Setup Guide

## Making a User an Admin

To grant admin privileges to a user, you need to manually update their `isAdmin` field in the Firestore database.

### Steps to Make a User Admin:

1. **Get the User's ID:**
   - Have the user sign in to the application
   - The user's ID is their Firebase UID (visible in Firebase Console > Authentication)

2. **Open Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to **Firestore Database**

3. **Update the User Document:**
   - Find the `users` collection
   - Locate the user document by their ID
   - Add or update the `isAdmin` field to `true`

### Example Firestore Document:

```
users/{userId}
{
  id: "user123abc",
  email: "admin@example.com",
  username: "adminuser",
  displayName: "Admin User",
  isAdmin: true,  // <-- Set this to true
  // ... other fields
}
```

### Admin Badge Display

Once a user is set as an admin, they will see a red "ADMIN" badge next to their name in:
- Player cards on the home page
- Friends sidebar (party members and friends list)
- Profile modal

### Admin Functionality

Currently, the admin system provides:
- Visual identification with the red "ADMIN" badge
- Backend logic structure for future admin features

### Future Admin Features

The admin system is designed to support:
- Moderation tools
- User management
- Server administration
- Game management features

## Security Note

Admin privileges should only be granted to trusted users. Always verify the user's identity before granting admin access.

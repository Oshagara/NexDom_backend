### 1. **Login**
```json
{
  "email": "admin@example.com",
  "password": "yourPassword123",
  "twofaCode": "123456" // Only if 2FA is enabled
}
```

---

### 2. **Create Admin** (`POST /admin/create-admin`)
```json
{
  "name": "Jane Doe",
  "email": "jane.admin@example.com",
  "password": "securePassword123",
  "role": "admin"
}
```

---

### 3. **Update Admin** (`PATCH /admin/update-admin/:adminId`)
```json
{
  "name": "Jane D. Admin",
  "email": "jane.admin@example.com",
  "password": "newPassword123",
  "role": "admin",
  "status": "active"
}
```

---

### 4. **Change Admin Role** (`PATCH /admin/change-role/:adminId`)
```json
{
  "newRole": "superadmin"
}
```

---

### 5. **Update Own Profile** (`PATCH /admin/me/profile`)
```json
{
  "name": "Jane D. Admin",
  "email": "jane.admin@newmail.com",
  "currentPassword": "yourCurrentPassword"
}
```

---

### 6. **Change Own Password** (`PATCH /admin/me/password`)
```json
{
  "currentPassword": "yourCurrentPassword",
  "newPassword": "yourNewPassword"
}
```

---

### 7. **Request Password Reset** (`POST /admin/request-password-reset`)
```json
{
  "email": "admin@example.com"
}
```

---

### 8. **Reset Password** (`POST /admin/reset-password`)
```json
{
  "token": "resetTokenFromEmail",
  "newPassword": "yourNewPassword"
}
```

---

### 9. **Enable 2FA** (`POST /admin/2fa/enable`)
```json
{
  "token": "123456" // TOTP code from your authenticator app
}
```

---

### 10. **Disable 2FA** (`POST /admin/2fa/disable`)
```json
{
  "password": "yourCurrentPassword",
  "token": "123456" // TOTP code from your authenticator app
}
```

---

### 11. **Impersonate Admin** (`POST /admin/impersonate`)
```json
{
  "adminId": "ADM-1234567890-123", // or
  "email": "target.admin@example.com"
}
```

---

### 12. **Update Admin Permissions** (`PATCH /admin/:adminId/permissions`)
```json
{
  "permissions": ["manageUsers", "manageProperties", "viewReports"]
}
```
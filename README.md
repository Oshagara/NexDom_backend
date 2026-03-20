# 🏠 Infinity Housing – Real Estate Backend

Infinity Housing is a backend API built with **NestJS**, **MongoDB**, and **Flutterwave**, allowing **agents to register/login**, **post property listings**, and **users to save favorites**. It also includes payment and email support.

---

## 🚀 Features

* ✅ JWT Auth (Agent login/register)
* ✅ Property listing (linked to agent)
* ✅ Save/favorite property
* ✅ Payment via Flutterwave
* ✅ Email confirmation (via Gmail SMTP)
* ✅ MongoDB-based storage
* ✅ Role-based architecture ready

---

## 📁 Project Structure

```
src/
├── agents/              # Agent register/login
├── auth/                # JWT authentication
├── property/            # Property CRUD
├── saved-property/      # Favorite listings
├── payment/             # Flutterwave payment
├── common/              # Utilities (e.g., decorators)
├── app.module.ts
└── main.ts
```

---

## 🛠️ Installation

```bash
git clone https://github.com/oshagara/infinity-housing.git
cd infinity-housing
npm install
```

---

## 📦 Environment Variables

Create a `.env` file at the root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/infinity-housing
JWT_SECRET=your_jwt_secret

# Flutterwave
FLW_SECRET_KEY=FLW_SECRET
FLW_BASE_URL=https://api.flutterwave.com/v3

# Gmail SMTP
MAIL_USER=yourgmail@gmail.com
MAIL_PASS=your-app-password
```

---

## 🧪 Run App

```bash
npm run start:dev
```

Server runs at: `http://localhost:3000`

---

## 🔐 Auth Endpoints

| Method | Endpoint         | Description       |
| ------ | ---------------- | ----------------- |
| POST   | `/auth/register` | Register an agent |
| POST   | `/auth/login`    | Login & get JWT   |

---

## 🏠 Property Endpoints (JWT required to post)

| Method | Endpoint          | Description              |
| ------ | ----------------- | ------------------------ |
| POST   | `/properties`     | Create property *(auth)* |
| GET    | `/properties`     | List all properties      |
| GET    | `/properties/:id` | View one property        |
| PUT    | `/properties/:id` | Update property *(auth)* |
| DELETE | `/properties/:id` | Delete property *(auth)* |

---

## ❤️ Saved Properties

| Method | Endpoint          | Description                |
| ------ | ----------------- | -------------------------- |
| POST   | `/saved`          | Save a property *(auth)*   |
| GET    | `/saved/:agentId` | Get all saved for an agent |

---

## 💳 Payment (Flutterwave)

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| POST   | `/payment/initiate`       | Start payment         |
| GET    | `/payment/verify?tx_ref=` | Verify payment status |
| GET    | `/payment/all`            | List all payments     |

---

## 📧 Email Setup (Gmail)

* Enable 2FA on Gmail
* Create **App Password**
* Use it in `.env` as `MAIL_PASS`

---

## 🔐 Testing JWT with Postman

1. `POST /auth/login`
   → Get `access_token`

2. Add to Postman headers:

```
Authorization: Bearer <access_token>
```

3. Then test: `POST /properties`, `POST /saved`, etc.

---

## 📌 TODO / Future Improvements

* [ ] Admin role for approving listings
* [ ] Upload images to Cloudinary/S3
* [ ] Advanced filters & location search
* [ ] End-to-end tests
* [ ] Notification system

---

## 👨‍💻 Tech Stack

* **NestJS**
* **MongoDB**
* **Mongoose**
* **Flutterwave**
* **JWT**
* **Nodemailer (Gmail SMTP)**

---

## 📬 Author

Built by **Israel Oshagara**
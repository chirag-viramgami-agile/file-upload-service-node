# File Upload Service (Node.js)

A robust and scalable file upload service built with Node.js, Express, and MongoDB. This service provides secure file upload functionality with database integration for managing file metadata.

## 🌐 Live Deployment

**URL:** [https://file-upload-service-node.onrender.com](https://file-upload-service-node.onrender.com)

## 📋 Features

- ✅ Secure file upload with validation
- ✅ File metadata storage in MongoDB
- ✅ RESTful API endpoints
- ✅ Error handling and logging
- ✅ CORS support for cross-origin requests
- ✅ Environment configuration management
- ✅ Production-ready deployment

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **File Handling:** Multer
- **Hosting:** Render

## 📁 Project Structure

```
file-upload-service-node/
├── config/              # Configuration files
├── models/              # MongoDB data models
├── public/              # Static files and frontend assets
├── index.js             # Application entry point
├── server.js            # Server configuration and setup
├── package.json         # Project dependencies and scripts
├── package-lock.json    # Dependency lock file
└── .gitignore           # Git ignore rules
```

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- MongoDB instance (local or cloud-based)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/chirag-viramgami-agile/file-upload-service-node.git
   cd file-upload-service-node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   The service will be running at `http://localhost:5000`

## 🔌 API Endpoints

### Upload File
- **Endpoint:** `POST /api/upload`
- **Description:** Upload a file to the service
- **Request:** Form data with `file` field
- **Response:** File metadata and storage information

### Get Files
- **Endpoint:** `GET /api/files`
- **Description:** Retrieve list of uploaded files
- **Response:** Array of file metadata

### Get File by ID
- **Endpoint:** `GET /api/files/:id`
- **Description:** Retrieve specific file metadata
- **Response:** File metadata object

### Delete File
- **Endpoint:** `DELETE /api/files/:id`
- **Description:** Delete a file by ID
- **Response:** Deletion confirmation

## 🛠️ Configuration

The application uses environment variables for configuration. Key variables include:

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development/production)

Configure these in your `.env` file or hosting platform environment settings.

## 📝 Dependencies

Key npm packages used in this project:

- **express** - Web framework
- **mongoose** - MongoDB object modeling
- **multer** - File upload middleware
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing

For complete list, see `package.json`

## 🚀 Deployment

This project is deployed on **Render** and can be accessed at:
- **Live URL:** https://file-upload-service-node.onrender.com

### Deploy to Render

1. Connect your GitHub repository to Render
2. Configure environment variables in Render dashboard
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy!

## 📚 Development

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload (if configured)

### Adding New Features

1. Create models in `models/` directory
2. Add API routes in appropriate controller files
3. Update configuration if needed
4. Test thoroughly before deployment

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**Chirag Viramgami**
- GitHub: [@chirag-viramgami-agile](https://github.com/chirag-viramgami-agile)

## 🤔 FAQ

**Q: How do I handle large file uploads?**
A: Configure Multer limits in server.js and adjust MongoDB storage settings accordingly.

**Q: Can I integrate with cloud storage?**
A: Yes, you can modify the upload logic to store files in S3, Google Cloud Storage, or similar services.

**Q: Is the service production-ready?**
A: Yes, with proper security configurations and environment setup it's ready for production use.

## 📞 Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

Made with ❤️ by Chirag Viramgami
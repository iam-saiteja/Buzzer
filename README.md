# Buzzer System

## Overview

This is a real-time buzzer system designed for interactive games or events, built using Node.js, Express.js, and Socket.IO. It allows for the creation of game sessions, participant management, and real-time buzzing with time tracking.

## Features

*   **Real-time Interaction:** Powered by Socket.IO for instant communication between admin and participants.
*   **Game Sessions:** Create unique game sessions with auto-generated codes.
*   **Participant Management:** Admins can manage participants, including adding and removing them.
*   **Buzzer Control:** Admin can start and stop the buzzer for each round.
*   **Buzz Time Tracking:** Records and displays the exact time each participant buzzes.
*   **QR Code Access:** Easily share the user interface with participants via a generated QR code.
*   **Admin and User Interfaces:** Separate interfaces for game administration and participant interaction.

## Technologies Used

*   **Backend:** Node.js, Express.js, Socket.IO
*   **Utilities:** CORS, `open` (for opening URLs), `qrcode` (for QR code generation)
*   **Development:** Nodemon (for automatic server restarts during development)

## Getting Started

### Prerequisites

Make sure you have Node.js installed on your system.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/iam-saiteja/Buzzer.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd Buzzer
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

#### Development Mode (with Nodemon)

To run the application in development mode with automatic restarts on file changes:

```bash
npm run dev
```

#### Production Mode

To start the application:

```bash
npm start
```

#### Running on Network (for external access)

To make the application accessible from other devices on your network:

```bash
npm run start:network
```

### Accessing the Application

Once the server is running, you can access the following:

*   **Admin Interface:** `http://<your-ip-address>:3000/admin.html`
*   **User Interface (for participants):** `http://<your-ip-address>:3000/user.html`
*   **QR Code for User Interface:** `http://<your-ip-address>:3000/qr`

(Replace `<your-ip-address>` with the actual IP address of the machine running the server. When running locally, you can use `localhost`.)

## How to Use

1.  **Admin:** Open the `admin.html` page. You can create a new game session.
2.  **Participants:** Scan the QR code or navigate to the `user.html` page. Enter the game code provided by the admin and a unique username to join the game.
3.  **Game Flow:** The admin can start and stop the buzzer. Participants buzz in, and their buzz times are recorded and displayed to the admin.

## Project Structure

```
. 
├── public/
│   ├── js/             # Frontend JavaScript files
│   ├── admin.html      # Admin interface HTML
│   ├── adminlogin.html # Admin login HTML
│   └── user.html       # Participant interface HTML
├── server.js           # Main backend application logic
├── package.json        # Project metadata and dependencies
└── package-lock.json   # Dependency lock file
```

## Contributing

Feel free to fork the repository and contribute! Pull requests are welcome.

## License

[Consider adding a license here, e.g., MIT, Apache 2.0, etc.]

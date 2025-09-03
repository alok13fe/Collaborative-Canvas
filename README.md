# **CollabCanvas \- A Real-Time Collaborative Whiteboard**

CollabCanvas is a feature-rich, web-based vector drawing application built with Next.js and TypeScript, inspired by the popular tool Excalidraw. It provides a seamless, real-time collaborative environment for users to sketch ideas, create diagrams, and work together visually.

## **✨ Key Features**

This application was built from the ground up to support a robust and intuitive user experience.

#### **🎨 Drawing & Shape Tools**

* **Multiple Shape Tools:** Create Rectangles, Ellipses, Diamonds, Arrows, and Lines.  
* **Freehand Pencil:** A pencil tool with a line-smoothing algorithm to create natural, fluid strokes.  
* **Text Tool:** Add and edit text directly on the canvas with an auto-resizing text area.  
* **Eraser Tool:** Easily remove elements from the canvas.

#### **interactive Manipulation**

* **Advanced Selection:** Select single or multiple shapes using a drag-to-select box.  
* **Element Transformation:** Move, resize, and rotate elements with intuitive interactive handles.  
* **Proportional Group Resizing:** Scale multiple selected objects at once while maintaining their relative positions and aspect ratios.  
* **Curve Editing:** Modify the curve of lines and arrows by dragging a central control point.  
* **Z-Index Control:** Manage the stacking order of shapes with "Bring to Front" and "Send to Back" commands.

#### **🤝 Real-Time Collaboration**

* **Room-Based Collaboration:** Create and join unique rooms (/room/\[roomId\]) for shared drawing sessions.  
* **Live Updates:** All shape creations, modifications, and deletions are broadcast to connected users in real-time using **WebSockets**.  
* **Persistent Sessions:** User accounts and login states are persisted using **Redux Persist**, ensuring a seamless experience for returning users.

#### **🛠️ Core Functionality**

* **Undo/Redo:** A complete history stack for all actions on the canvas.  
* **Copy/Paste & Cut:** Full clipboard support using the browser's Clipboard API.  
* **Pan & Zoom:** Navigate the infinite canvas with ease.  
* **Save to Server:** All shapes are associated with user accounts and saved to a PostgreSQL database.

## **🚀 Tech Stack**

The project leverages a modern, type-safe, and scalable technology stack.

* **Frontend:** [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)  
* **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/) (with Redux Persist for session management)  
* **Real-Time Communication:** [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)  
* **Canvas Rendering:** [HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)  
* **Backend & Database:** [Prisma](https://www.prisma.io/), [PostgreSQL](https://www.postgresql.org/)  
* **Deployment:** [Docker](https://www.docker.com/)

## **🏛️ Project Architecture**

The application is built on a clean separation of concerns, ensuring maintainability and scalability.

1. **Smart Component, Dumb Class:** The core architecture separates the "smart" React Canvas component from a "dumb" Board.ts utility class.  
   * The **React Component** manages all state by subscribing to the Redux store and handles user events.  
   * The **Board.ts Class** is a stateless utility that receives state as props and contains all the pure logic for canvas rendering and geometric calculations.  
2. **Redux as Single Source of Truth:** All application state—from shape data to the currently selected tool—is managed by Redux Toolkit. This provides a predictable, one-way data flow.  
3. **WebSocket Service:** Real-time communication is handled by a dedicated WebSocket service, which is decoupled from the UI and Redux store. When a local user modifies a shape, an action is dispatched to both the local Redux store (for an instant UI update) and the WebSocket service (to broadcast to other clients).

## **🏁 Getting Started**

Follow these instructions to get a local copy up and running for development and testing purposes.

### **Prerequisites**

* Node.js (v18 or later)  
* pnpm  
* Docker (for running a local PostgreSQL instance)

### **Installation**

1. **Clone the repository:**  
   git clone \[https://github.com/your-username/collabcanvas.git\](https://github.com/your-username/collabcanvas.git)  
   cd collabcanvas

2. **Install dependencies:**  
   pnpm install

3. **Set up environment variables:**  
   cp .env.example .env

   *Fill in the .env file with your database credentials and other necessary variables.*  
4. **Set up the database:**  
   * Start a PostgreSQL instance using Docker.  
   * Run Prisma migrations to create the necessary tables:  
     pnpm db:push

5. **Run the development server:**  
   pnpm dev

   The application will be available at http://localhost:3000.

## **🐳 Running with Docker**

You can also build and run the entire application using the provided multi-stage Dockerfile.

1. **Build the Docker image:**  
   docker build \-t collabcanvas .

2. **Run the Docker container:**  
   docker run \-p 3000:3000 collabcanvas

## **📜 License**

This project is licensed under the MIT License \- see the LICENSE file for details.
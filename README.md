# **Collaborative Canvas \- A Real-Time Collaborative Whiteboard**

Collaborative Canvas is a full-stack, web-based vector drawing application built with a modern, decoupled architecture. Inspired by tools like Excalidraw, it provides a seamless, real-time collaborative environment for users to sketch ideas, create diagrams, and work together visually from anywhere.

## **✨ Key Features**

This application was built from the ground up to support a robust and intuitive user experience for both single users and collaborative teams.

#### **🎨 Drawing & Shape Tools**

* **Multiple Shape Tools:** Create Rectangles, Ellipses, Diamonds, Arrows, and Lines.  
* **Freehand Pencil:** A pencil tool .  
* **Text Tool:** Add and edit multi-line text directly on the canvas with an auto-resizing text area.  
* **Eraser Tool:** Easily remove elements from the canvas.

#### **interactive Manipulation**

* **Advanced Selection:** Select single or multiple shapes using a click or a drag-to-select box.  
* **Element Transformation:** Move, resize, and rotate elements with intuitive interactive handles.  
* **Curve Editing:** Modify the curve of lines and arrows by dragging a central control point.  

#### **🤝 Real-Time Collaboration**

* **Room-Based Collaboration:** Create and join unique rooms (/room/\[roomId\]) for shared drawing sessions.  
* **Live Updates:** All shape creations, modifications, and deletions are broadcast to connected users in real-time using **WebSockets**.  
* **Persistent Sessions:** User accounts and login states are persisted using **Redux Persist** with an expiration transform, ensuring a seamless experience for returning users.

#### **🛠️ Core Functionality**

* **Undo/Redo:** A complete history stack for all actions on the canvas.  
* **Copy/Paste & Cut:** Full clipboard support using the browser's Clipboard API.  
* **Pan & Zoom:** Navigate the infinite canvas with ease.  
* **Save to Server:** All shapes are associated with user accounts and saved to a PostgreSQL database via a secure, authenticated API.

## **🚀 Tech Stack**

The project leverages a modern, type-safe, and scalable technology stack organized within a Turborepo monorepo.

* **Frontend:** [Next.js](https://nextjs.org/) / [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)  
* **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/) (with Redux Persist)  
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)  
* **Canvas Rendering:** [HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)  
* **Backend (HTTP):** [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/)  
* **Backend (Real-Time):** [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) (using the ws library)  
* **Database & ORM:** [PostgreSQL](https://www.postgresql.org/), [Prisma](https://www.prisma.io/)  
* **Infrastructure & Tooling:** [Turborepo](https://turbo.build/repo), [Redis](https://redis.io/), [Docker](https://www.docker.com/), [JWT](https://jwt.io/) for Authentication, [Zod](https://zod.dev/) for Schema Validation

## **🏛️ Architecture**

The application is built on a decoupled, multi-service architecture to ensure scalability and maintainability.

1. **Monorepo with 4 Services:** The project is organized in a **Turborepo** monorepo containing four distinct services: the Next.js frontend, a RESTful HTTP backend, a dedicated WebSocket server, and a background worker.  
2. **Decoupled Backend:** The system is engineered for high performance by decoupling the real-time server from the database.  
   * The **WebSocket Server** is responsible only for low-latency communication. It authenticates users, manages room state, and instantly broadcasts UI updates to clients.  
   * All database operations (adding, modifying, or deleting shapes) are offloaded to a **Redis message queue**.  
   * A separate **Background Worker** process consumes jobs from the Redis queue, validates the data, and securely writes to the PostgreSQL database via the HTTP backend. This ensures that database load never impacts the real-time collaborative experience.  
3. **Client-Side Logic:** The frontend follows a "Smart Component, Dumb Class" model. The React Canvas component manages state from Redux, while a stateless Board.ts class handles all pure rendering and geometric logic.

## **🏁 Docker Installation*

Follow these instructions to get a local copy up and running for development.

1. **Clone the repository:**  
   git clone [https://github.com/alok13fe/collaborative-canvas.git](https://github.com/alok13fe/collaborative-canvas.git)  
   cd '.\Collaborative Canvas\'

2. **Set up environment variables:**  
   cp .env.example .env

   *Fill in the .env file with your database credentials, JWT secret, and other necessary variables.*  

3. **Run the Docker containers:**  
   docker-compose up  

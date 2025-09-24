import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from "@/components/theme-provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "non.geist";
import "./index.css";
import App from "./app";
import HomePage from "./pages/HomePage";
import ProjectEditorPage from "./pages/ProjectEditorPage";

// Global suppression of annoying findDOMNode warnings
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('findDOMNode') || message.includes('react-draggable')) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('findDOMNode') || message.includes('react-draggable')) {
    return;
  }
  originalError.apply(console, args);
};

// Disable browser swipe navigation (back/forward gestures)
document.addEventListener('touchstart', (e) => {
  // Prevent swipe navigation on horizontal scrollable elements
  const target = e.target as HTMLElement;
  const scrollableParent = target.closest('[data-horizontal-scroll], .timeline-container, canvas');
  
  if (scrollableParent || target.tagName === 'CANVAS') {
    // Allow the touch but prevent browser navigation
    e.stopPropagation();
  }
}, { passive: false });

// Prevent overscroll behavior that triggers navigation
document.body.style.overscrollBehaviorX = 'none';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "project/:projectId",
        element: <ProjectEditorPage />,
      },
    ],
  },
]);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);

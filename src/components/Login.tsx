import React, { useState } from "react";
import { X } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");

  if (!isOpen) return null;

  let handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  let isLogin = mode === "login";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md relative mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3 sm:mb-4">
            <label htmlFor="username" className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg"
            />
          </div>
          <div className="mb-3 sm:mb-4">
            <label htmlFor="password" className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg"
            />
          </div>
          {!isLogin && (
            <div className="mb-4 sm:mb-6">
              <label htmlFor="confirmPassword" className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="w-full px-3 py-2 text-sm sm:text-base border rounded"
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 text-sm sm:text-base rounded hover:bg-blue-600 transition duration-300"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            className="text-blue-500 hover:underline font-medium"
            onClick={() => setMode(isLogin ? "signup" : "login")}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

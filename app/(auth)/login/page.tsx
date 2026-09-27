"use client"
import { useState } from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-2">DsLiftAds Style Login</h2>
        <p className="text-center text-gray-500 mb-6">Welcome to UP-Network CPA</p>
        
        <input type="email" placeholder="Email" className="w-full p-3 mb-4 border rounded-lg" />
        <input type="password" placeholder="Password" className="w-full p-3 mb-4 border rounded-lg" />
        
        <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700">
          Sign In
        </button>
        
        <div className="flex justify-between mt-4 text-sm">
          <a href="/forgot" className="text-blue-600">Forgot Password?</a>
          <a href="/register" className="text-blue-600">Create Account</a>
        </div>
      </div>
    </div>
  )
}

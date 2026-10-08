import { useState } from 'react';

export default function Intro({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-grey flex flex-col items-center justify-center p-lg animate-fade-in">
      <div className="max-w-md w-full text-center">
        <h1 className="font-primary text-4xl text-green mb-lg">Found</h1>
        <p className="font-body text-base text-black mb-xl">
          reclaim the moment
        </p>
        
        <div className="bg-white p-lg rounded-lg mb-xl shadow-sm">
          <p className="font-body text-sm text-dark-grey mb-md">
            It's easy to get caught up in worry and miss what's right in front of us.
            Found helps you slow down and notice the world around you.
          </p>
          <p className="font-body text-sm text-dark-grey">
            [STAT TO BE ADDED]
          </p>
        </div>

        <button
          onClick={onGetStarted}
          className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
        >
          Get started
        </button>
      </div>
    </div>
  );
}

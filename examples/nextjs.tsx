"use client"

import React, { useState, useEffect } from 'react';
import { Thumbmark } from "@thumbmarkjs/thumbmarkjs";

function Fingerprint() {
    const [thumbmark, setThumbmark] = useState('');
  
    useEffect(() => {
      const tm = new Thumbmark;
      tm.get()
        .then((result) => {
          setThumbmark(result.thumbmark);
        })
        .catch((error) => {
          console.error('Error getting fingerprint:', error);
        });
    }, []);
    
    return (
      <>{thumbmark}</>
    );
  }

export default Fingerprint
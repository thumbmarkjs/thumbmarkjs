"use client"

import React, { useState, useEffect } from 'react';
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";

function Fingerprint() {
    const [fingerprint, setFingerprint] = useState('');
  
    useEffect(() => {
      getFingerprint()
        .then((result) => {
          setFingerprint(result);
        })
        .catch((error) => {
          console.error('Error getting fingerprint:', error);
        });
    }, []);
    
    return (
      <>{fingerprint}</>
    );
  }

export default Fingerprint
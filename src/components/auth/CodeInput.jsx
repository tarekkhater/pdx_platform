import React, { useRef } from 'react';
import { authInputClass } from '@/components/auth/AuthShell';

/**
 * The six-digit code from a verification email.
 *
 * One field rather than six boxes: a single input is what a password manager
 * and a phone's SMS autofill can both write into, and pasting a code from the
 * email works without the paste having to be split across elements.
 */
const CodeInput = ({ value, onChange, error, length = 6, id = 'code' }) => {
  const ref = useRef(null);

  const handleChange = (event) => {
    // Codes are digits; stripping anything else means a pasted "123 456" or
    // a trailing space does not read as an invalid code.
    const digits = event.target.value.replace(/\D/g, '').slice(0, length);
    onChange(digits);
  };

  return (
    <input
      id={id}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={length}
      value={value}
      onChange={handleChange}
      placeholder={'0'.repeat(length)}
      className={`${authInputClass(error)} text-center font-tabular tracking-[0.5em] text-[18px]`}
    />
  );
};

export default CodeInput;

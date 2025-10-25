// src/ui/Field.tsx
import { useState } from 'react';
import { COLORS } from '../theme';

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
};

export default function Field({ label, value, onChange, placeholder, type='text', multiline }: FieldProps){
  const [focused,setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 6 }}>{label}</div>

      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.currentTarget.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            border:'1.5px solid ' + (focused?COLORS.primary:COLORS.border),
            background:'#fff', color:COLORS.text, borderRadius:12,
            padding:'10px 14px', minHeight:92,
            boxShadow: focused ? '0 3px 8px rgba(15,23,42,.06)' : 'none',
            width:'100%'
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            border:'1.5px solid ' + (focused?COLORS.primary:COLORS.border),
            background:'#fff', color:COLORS.text, borderRadius:12,
            padding:'10px 14px',
            boxShadow: focused ? '0 3px 8px rgba(15,23,42,.06)' : 'none',
            width:'100%'
          }}
        />
      )}
    </div>
  );
}

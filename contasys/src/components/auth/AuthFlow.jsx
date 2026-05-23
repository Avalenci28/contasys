import { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

export default function AuthFlow({ onAuthSuccess }) {
  const [mode, setMode] = useState('login')

  if (mode === 'register') {
    return (
      <RegisterForm
        onSuccess={onAuthSuccess}
        onSwitchToLogin={() => setMode('login')}
      />
    )
  }

  return (
    <LoginForm
      onSuccess={onAuthSuccess}
      onSwitchToRegister={() => setMode('register')}
    />
  )
}


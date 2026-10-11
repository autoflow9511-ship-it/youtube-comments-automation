import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '@services/api';
export function ForgotPassword() {
 const [email,setEmail]=useState(''); const [loading,setLoading]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setMessage('');setError('');const valid=z.string().email().safeParse(email.trim());if(!valid.success){setError('Enter a valid email address.');return}setLoading(true);try{await authApi.forgotPassword(valid.data);setMessage('If an account exists, you will receive reset instructions.')}catch{setError('Password reset emails are not available right now. Please contact support.')}finally{setLoading(false)}};
 return <div className="space-y-5"><div className="text-center"><h2 className="text-xl font-bold">Reset your password</h2><p className="mt-2 text-sm text-slate-400">Enter the email associated with your account.</p></div><form onSubmit={submit} className="space-y-4"><label htmlFor="reset-email" className="label-normal">Email address</label><input id="reset-email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>{error&&<p role="alert" className="text-sm text-red-400">{error}</p>}{message&&<p role="status" className="text-sm text-green-400">{message}</p>}<button type="submit" disabled={loading} className="btn-primary w-full">{loading?'Checking…':'Request reset link'}</button></form><Link to="/login" className="block text-center text-sm text-violet-300 hover:text-violet-200">← Back to sign in</Link></div>
}

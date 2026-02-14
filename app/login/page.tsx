 'use client';


import { useState } from 'react';

import { supabase } from '@/lib/supabase-client';

import { useRouter } from 'next/navigation';

import Header from '@/components/Header';

import { LogIn, UserPlus, Loader2 } from 'lucide-react';


export default function LoginPage() {

const [isLogin, setIsLogin] = useState(true);

const [email, setEmail] = useState('');

const [password, setPassword] = useState('');

const [fullName, setFullName] = useState('');

const [loading, setLoading] = useState(false);

const router = useRouter();


const handleAuth = async (e: React.FormEvent) => {

e.preventDefault();

setLoading(true);


if (isLogin) {

const { error } = await supabase.auth.signInWithPassword({ email, password });

if (error) alert(error.message);

else router.push('/profile');

} else {

const { error } = await supabase.auth.signUp({

email,

password,

options: { data: { full_name: fullName } },

});

if (error) alert(error.message);

else alert('Проверьте почту для подтверждения регистрации!');

}

setLoading(false);

};


return (

<main className="min-h-screen bg-gray-50">

<Header />

<div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">

<h1 className="text-2xl font-bold text-center mb-8">

{isLogin ? 'Вход в личный кабинет' : 'Регистрация'}

</h1>


<form onSubmit={handleAuth} className="space-y-4">

{!isLogin && (

<div>

<label className="block text-sm font-medium mb-1">ФИО</label>

<input

type="text" required

className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"

value={fullName} onChange={(e) => setFullName(e.target.value)}

/>

</div>

)}

<div>

<label className="block text-sm font-medium mb-1">Email</label>

<input

type="email" required

className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"

value={email} onChange={(e) => setEmail(e.target.value)}

/>

</div>

<div>

<label className="block text-sm font-medium mb-1">Пароль</label>

<input

type="password" required

className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"

value={password} onChange={(e) => setPassword(e.target.value)}

/>

</div>


<button

type="submit" disabled={loading}

className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition"

>

{loading ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20}/> : <UserPlus size={20}/>)}

{isLogin ? 'Войти' : 'Создать аккаунт'}

</button>

</form>


<button

onClick={() => setIsLogin(!isLogin)}

className="w-full mt-6 text-sm text-gray-500 hover:text-blue-600 transition"

>

{isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}

</button>

</div>

</main>

);

};
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { createUserDocument, getInvite, deleteInvite } from '@/firestoreService';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Droplets } from 'lucide-react';

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);

      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().status === 'inactive') {
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'This account has been deactivated. Please contact an administrator.',
        });
        setLoading(false);
        return;
      }
      
      router.push('/');
    } catch (error: any) {
      let description = error.message;
      if (error.code === 'auth/configuration-not-found') {
        description = 'Email/Password sign-in is not enabled. Please enable it in your Firebase project console.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
        toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: 'Password must be at least 6 characters long.',
        });
        return;
    }
    setLoading(true);

    try {
      let userName = 'Admin User';
      let userShares = 0;
      let inviteIdToDelete: string | null = null;

      // Special case to allow admin creation without an invite
      if (signupEmail.toLowerCase() !== 'admin@aquawise.com') {
        const invite = await getInvite(signupEmail);

        if (!invite) {
          toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: 'This email has not been invited. Please contact an administrator.',
          });
          setLoading(false);
          return;
        }
        userName = invite.name;
        userShares = invite.shares;
        inviteIdToDelete = invite.id;
      }
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signupEmail,
        signupPassword
      );
      
      await createUserDocument(userCredential.user.uid, {
        name: userName,
        email: signupEmail,
        shares: userShares,
      });
      
      if(inviteIdToDelete) {
        await deleteInvite(inviteIdToDelete);
      }
      
      router.push('/');
    } catch (error: any)
    {
      let description = error.message;
      if (error.code === 'auth/configuration-not-found') {
        description = 'Email/Password sign-in is not enabled. Please enable it in your Firebase project console.';
      } else if (error.code === 'auth/email-already-in-use') {
        description = 'An account with this email already exists.';
      }
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description,
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Tabs defaultValue="login" className="w-[400px]">
        <div className="flex justify-center mb-4">
            <Droplets size={40} className="text-primary" />
        </div>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <form onSubmit={handleLogin}>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Enter your credentials to access your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <form onSubmit={handleSignUp}>
              <CardHeader>
                <CardTitle>Complete Registration</CardTitle>
                <CardDescription>
                  You must be invited by an administrator to create an account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? 'Signing up...' : 'Sign Up'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

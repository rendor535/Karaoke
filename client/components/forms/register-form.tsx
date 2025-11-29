'use client';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import axios from '@/lib/utils';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useUser } from '@/context/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';



const FormSchema = z.object({
  firstname: z.string().min(1, {
    message: 'Imię jest wymagane',
  }),
  lastname: z.string().min(1, {
    message: 'Nazwisko jest wymagane',
  }),
  email: z.string().email({
    message: 'Nieprawidłowy adres e-mail',
  }),
  password: z.string().min(6, {
    message: 'Hasło musi mieć co najmniej 6 znaków',
  })
  .refine(val => /[A-Z]/.test(val), {
    message: 'Hasło musi mieć przynajmniej jedną dużą literę',
  })
  .refine(val => /[a-z]/.test(val), {
    message: 'Hasło musi mieć przynajmniej jedną małą literę',
  })
  .refine(val => /[0-9]/.test(val), {
    message: 'Hasło musi zawierać liczby',
  })
  .refine(val => /[^a-zA-Z0-9]/.test(val), {
    message: 'Hasło musi mieć znaki specjalne',
  }),
  confirmPassword: z.string(),
  managerLimitPln: z
  .number()
  .min(0, { message: 'Limit musi być liczbą większą lub równą 0' })
  .optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Hasła nie pasują do siebie',
    });
  }
});

export default function RegisterForm() {
  const user = useUser();
  console.log('user', user);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: '',
      managerLimitPln: user?.role === 'admin' ? 0 : undefined,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...sanitizedData } = data;

    try {
      await axios.post('api/Users', sanitizedData);
      toast.success('Konto zostało pomyślnie utworzone');
    } catch (error) {
      if (isAxiosError(error)) {
        if (isAxiosError(error)) {
          toast.error(error.response?.data ?? 'Wystąpił nieznany błąd');
        } else {
          toast.error('Wystąpił błąd połączenia');
        }
      }
    }
  }

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (user?.role !== 'admin' && user?.role !== 'manager') {
        return (
            <Card>
                <CardContent className="py-8">
                    <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                            Nie masz uprawnień do tworzenia kont użytkowników
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }


  return (
    <Form {...form}>
      <div className="relative w-1/3">
        <h1
          className="absolute bottom-20 w-1/1 text-4xl text-slate-900 dark:text-yellow-600 font-medium text-center font-serif"> BuyGuard
        </h1>

        <h2 className="absolute bottom-10 w-1/1 text-2xl text-slate-900 dark:text-sky-50 font-medium text-center">Stwórz
          konto</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="w-1/3 space-y-6">
        <FormField
          control={form.control}
          name="firstname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imię</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwisko</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>

              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres e-mail</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hasło</FormLabel>
              <FormControl>
                <div className={'relative'}>
                  <Input {...field} type={showPassword ? 'text' : 'password'}/>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                  </button>
                </div>
              </FormControl>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Potwierdź hasło</FormLabel>
              <FormControl>
                <div className={'relative'}>
                  <Input {...field} type={showConfirmPassword ? 'text' : 'password'}/>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                  </button>
                </div>
              </FormControl>
              <FormMessage/>
            </FormItem>
          )}
        />
        {user?.role === 'admin' && (
          <FormField
            control={form.control}
            name="managerLimitPln"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type={'number'} {...field} onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                  }/>
                </FormControl>
                <FormMessage/>
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className={'w-full'}>{user?.role === 'admin' ? 'Zarejestruj menadżera' : 'Zarejestruj pracownika'}</Button>
      </form>
    </Form>
  );
}
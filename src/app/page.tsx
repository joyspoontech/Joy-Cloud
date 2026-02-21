"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Shield, Cloud, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        router.push('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        router.push('/dashboard');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-blue-500/20">
      {/* Navbar - Sticky Glass */}
      <header className="fixed top-0 w-full z-50 glass border-b border-gray-200/50 dark:border-white/5 transition-all duration-300">
        <div className="px-6 h-16 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="h-9 w-9 bg-white rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center overflow-hidden">
              <Image src="/icon.png" alt="Joy Cloud Logo" width={36} height={36} className="object-cover" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Joy Cloud</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-sm font-medium">
            {[
              ['Features', '#features'],
              ['Pricing', '#pricing'],
              ['About', '#about']
            ].map(([label, href]) => (
              <a key={label} href={href} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex space-x-2 md:space-x-4">
            {loading ? (
              <div className="h-10 w-24 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md" />
            ) : session ? (
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20 border-0 text-sm md:text-base">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="hidden sm:inline-flex hover:bg-blue-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200">Log In</Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20 border-0 text-sm md:text-base">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative px-6 py-24 lg:py-36 max-w-7xl mx-auto text-center overflow-hidden">

          {/* Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 dark:bg-blue-500/20 blur-[100px] rounded-full -z-10" />

          <div className="animate-fade-in-up space-y-8 relative z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
              v2.0 Now Available with Enterprise S3
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] text-balance">
              Secure Cloud Storage <br />
              <span className="text-gradient">for Professionals</span>
            </h1>

            <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-balance">
              Bank-grade encryption, role-based access control, and lightning-fast S3 speeds.
              The storage solution your business can trust.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 w-full sm:w-auto rounded-full">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="secondary" size="lg" className="h-14 px-8 text-lg glass-card hover:bg-white/50 dark:hover:bg-slate-800 w-full sm:w-auto rounded-full">
                View Demo
              </Button>
            </div>
          </div>

          <div className="mt-24 relative max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card rounded-2xl p-2 md:p-4">
              <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-800">
                <Image
                  src="/dashboard-preview.png"
                  alt="Joy Cloud Dashboard Preview"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            {/* Decorative abstract elements behind mockup */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full -z-10" />
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full -z-10" />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-slate-50 dark:bg-slate-950/50 py-32 px-6 border-t border-gray-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">Why Joy Cloud?</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                We ve re-engineered cloud storage from the ground up to focus on what matters most: security, speed, and simplicity.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: "Enterprise Security",
                  desc: "Role-Based Access Control (RBAC) and Row Level Security ensures your data stays completely private.",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10"
                },
                {
                  icon: Cloud,
                  title: "S3 Powered Speed",
                  desc: "Direct-to-cloud uploads mean unlimited scalability and lightning fast transfer speeds anywhere globally.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  icon: Lock,
                  title: "Encrypted at Rest",
                  desc: "Your files are encrypted with AES-256 before they even touch our servers. Your keys, your data.",
                  color: "text-violet-500",
                  bg: "bg-violet-500/10"
                }
              ].map((feature, i) => (
                <div key={i} className="glass-card hover:-translate-y-2 transition-transform duration-300 p-8 rounded-2xl group">
                  <div className={`h-14 w-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Trust Section */}
        <section className="py-24 px-6 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="bg-slate-900 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800 rounded-3xl p-12 lg:p-20 text-center relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

              <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                <h2 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
                  Ready to secure your business?
                </h2>
                <p className="text-slate-300 text-lg">
                  Join 10,000+ professionals trusting Joy Cloud with their mission-critical data today.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                  <Link href="/login">
                    <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-gray-100 border-0 rounded-full w-full sm:w-auto">
                      Get Started Now
                    </Button>
                  </Link>
                  <div className="flex items-center justify-center text-slate-400 text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" /> No credit card required
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 relative">
                <Image src="/icon.png" alt="Joy Cloud Logo" fill className="object-contain" />
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">Joy Cloud</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs">
              Secure, scalable, and simple file storage for modern teams and professionals.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400 text-sm">
              <li><a href="#" className="hover:text-blue-600">Features</a></li>
              <li><a href="#" className="hover:text-blue-600">Security</a></li>
              <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400 text-sm">
              <li><a href="#" className="hover:text-blue-600">About</a></li>
              <li><a href="#" className="hover:text-blue-600">Blog</a></li>
              <li><a href="#" className="hover:text-blue-600">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
          <p>&copy; 2026 Joy Cloud Inc.</p>
          <div className="space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

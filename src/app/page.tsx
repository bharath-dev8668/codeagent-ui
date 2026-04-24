import React from "react";
import ShaderBackground from "@/components/ui/shader-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Shield, Cpu } from "lucide-react";

export default function Page() {
  return (
    <main className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {/* Background Shader */}
      <ShaderBackground />

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center">

        {/* Hero Section */}
        <section className="mt-20 flex flex-col items-center text-center p-12 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
            Next-Gen AI Platform
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mb-10">
            Experience the future of intelligent applications with our cutting-edge AI architecture. Unmatched speed, absolute security, and boundless power.
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="px-8 py-6 text-lg rounded-full">
              Get Started
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {/* Feature 1: Speed */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white shadow-xl hover:bg-black/30 transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4 border border-white/5">
                <Zap className="text-white w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Lightning Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-white/60 text-base">
                Optimized infrastructure ensures sub-millisecond response times for all your AI-driven queries and tasks.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 2: Security */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white shadow-xl hover:bg-black/30 transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4 border border-white/5">
                <Shield className="text-white w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Enterprise Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-white/60 text-base">
                Bank-grade encryption and strict data isolation guarantees your models and data remain entirely yours.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 3: AI-Power */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white shadow-xl hover:bg-black/30 transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4 border border-white/5">
                <Cpu className="text-white w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">AI-Powered Core</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-white/60 text-base">
                Built from the ground up with native machine learning integrations to automate complex workflows effortlessly.
              </CardDescription>
            </CardContent>
          </Card>
        </section>

      </div>
    </main>
  );
}

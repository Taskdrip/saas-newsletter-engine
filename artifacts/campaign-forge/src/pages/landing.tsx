import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Send, BarChart3, Users, Zap, 
  CheckCircle2, Globe, Shield, Activity
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 border-b border-border bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              <Send className="w-4 h-4" />
            </div>
            <span className="text-xl font-bold tracking-tight">CampaignForge</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
            <Link href="/sign-up" className="block">
              <Button>Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-20 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" /> Introducing AI-Powered Segments
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
            The Command Center for <span className="text-primary">Professional</span> Email Teams
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Build, test, and scale complex email marketing campaigns from a single workspace. Stop fighting your tools and start delivering results.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up" className="block">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full">Start Building Free</Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full">
              View Interactive Demo
            </Button>
          </div>
          <div className="mt-12 text-sm text-muted-foreground flex items-center justify-center gap-8">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 14-day premium trial</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Cancel anytime</div>
          </div>
        </section>

        {/* Mockup / Image Section placeholder */}
        <section className="px-4 max-w-6xl mx-auto mb-32">
          <div className="aspect-[16/9] w-full rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 font-mono text-sm">Dashboard Mockup Rendered Here</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-gray-50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to orchestrate campaigns</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">We've built the most precise tools for teams that take email seriously.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Visual Automation Builder", desc: "Design complex journeys with a drag-and-drop canvas that feels like magic." },
                { icon: Users, title: "Dynamic Segments", desc: "Target users with pinpoint accuracy using real-time behavioral data." },
                { icon: BarChart3, title: "Deep Analytics", desc: "Understand exactly what drives conversion with multi-touch attribution tracking." },
                { icon: Shield, title: "Multi-Workspace Ready", desc: "Manage multiple brands or clients from a single login without mixing data." },
                { icon: Globe, title: "Global Delivery Infrastructure", desc: "Bring your own SMTP or use our optimized routing to ensure inbox placement." },
                { icon: Activity, title: "Real-time Monitoring", desc: "Watch your campaigns deploy and perform in real-time. Catch issues instantly." }
              ].map((f, i) => (
                <div key={i} className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-foreground text-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
              <div>
                <div className="text-5xl font-extrabold mb-2 text-primary">10M+</div>
                <div className="text-gray-400 font-medium tracking-wide">Emails Delivered Daily</div>
              </div>
              <div>
                <div className="text-5xl font-extrabold mb-2 text-primary">99.9%</div>
                <div className="text-gray-400 font-medium tracking-wide">Uptime Guarantee</div>
              </div>
              <div>
                <div className="text-5xl font-extrabold mb-2 text-primary">&lt;50ms</div>
                <div className="text-gray-400 font-medium tracking-wide">API Latency</div>
              </div>
              <div>
                <div className="text-5xl font-extrabold mb-2 text-primary">24/7</div>
                <div className="text-gray-400 font-medium tracking-wide">Expert Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Start for free, upgrade when you need more power.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-background rounded-3xl border border-border p-8 shadow-sm flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-muted-foreground mb-6">Perfect for side projects</p>
                <div className="text-4xl font-extrabold mb-6">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Up to 1,000 subscribers</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 1 workspace</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Basic templates</li>
                </ul>
                <Link href="/sign-up" className="block w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl">Get Started</Button>
                </Link>
              </div>
              
              <div className="bg-foreground text-background rounded-3xl border border-border p-8 shadow-xl flex flex-col relative transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold tracking-wide">MOST POPULAR</div>
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-gray-400 mb-6">For growing businesses</p>
                <div className="text-4xl font-extrabold mb-6">$49<span className="text-lg font-normal text-gray-400">/mo</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Up to 50,000 subscribers</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 5 workspaces</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Visual automation builder</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Custom SMTP</li>
                </ul>
                <Link href="/sign-up" className="block w-full">
                  <Button className="w-full h-12 rounded-xl text-lg">Start 14-Day Trial</Button>
                </Link>
              </div>

              <div className="bg-background rounded-3xl border border-border p-8 shadow-sm flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Business</h3>
                <p className="text-muted-foreground mb-6">For high-volume senders</p>
                <div className="text-4xl font-extrabold mb-6">$199<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Unlimited subscribers</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Unlimited workspaces</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Dedicated IP pool</li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Priority support</li>
                </ul>
                <Link href="/sign-up" className="block w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl">Contact Sales</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-extrabold mb-6">Ready to forge better campaigns?</h2>
            <p className="text-xl opacity-90 mb-10">Join thousands of marketers who have upgraded their email operations.</p>
            <Link href="/sign-up" className="block w-max mx-auto">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full text-primary font-bold hover:bg-white/90">
                Create Your Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-gray-400 py-12 text-sm text-center border-t border-gray-800">
        <p>&copy; {new Date().getFullYear()} CampaignForge. All rights reserved.</p>
      </footer>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";

// Pages
import LandingPage from "./pages/landing";
import DashboardPage from "./pages/dashboard";
import CampaignsPage from "./pages/campaigns";
import CampaignNewPage from "./pages/campaigns-new";
import SubscribersPage from "./pages/subscribers";
import ListsPage from "./pages/lists";
import SegmentsPage from "./pages/segments";
import TemplatesPage from "./pages/templates";
import AutomationsPage from "./pages/automations";
import FormsPage from "./pages/forms";
import WebsitesPage from "./pages/websites";
import SettingsPage from "./pages/settings";
import AnalyticsPage from "./pages/analytics";
import AdminDashboard from "./pages/admin/index";
import AdminProviders from "./pages/admin/providers";
import AdminPricing from "./pages/admin/pricing";
import AdminUsers from "./pages/admin/users";
import AppLayout from "./components/layout/AppLayout";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(15, 90%, 55%)",
    colorForeground: "hsl(0, 0%, 9%)",
    colorMutedForeground: "hsl(0, 0%, 45%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 98%)",
    colorInputForeground: "hsl(0, 0%, 9%)",
    colorNeutral: "hsl(0, 0%, 90%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-gray-100",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-gray-900",
    headerSubtitle: "text-sm text-gray-500",
    socialButtonsBlockButtonText: "text-sm font-medium text-gray-700",
    formFieldLabel: "text-sm font-medium text-gray-700",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-sm text-gray-500",
    dividerText: "text-xs text-gray-400 uppercase font-medium",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component {...rest} />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Forge",
            subtitle: "Sign in to access your campaigns",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <WorkspaceProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            {/* Protected Routes inside AppLayout */}
            <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
            <Route path="/campaigns"><ProtectedRoute component={CampaignsPage} /></Route>
            <Route path="/campaigns/new"><ProtectedRoute component={CampaignNewPage} /></Route>
            <Route path="/subscribers"><ProtectedRoute component={SubscribersPage} /></Route>
            <Route path="/lists"><ProtectedRoute component={ListsPage} /></Route>
            <Route path="/segments"><ProtectedRoute component={SegmentsPage} /></Route>
            <Route path="/templates"><ProtectedRoute component={TemplatesPage} /></Route>
            <Route path="/automations"><ProtectedRoute component={AutomationsPage} /></Route>
            <Route path="/forms"><ProtectedRoute component={FormsPage} /></Route>
            <Route path="/websites"><ProtectedRoute component={WebsitesPage} /></Route>
            <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
            <Route path="/analytics"><ProtectedRoute component={AnalyticsPage} /></Route>

            {/* Admin Routes */}
            <Route path="/admin/providers"><ProtectedRoute component={AdminProviders} /></Route>
            <Route path="/admin/pricing"><ProtectedRoute component={AdminPricing} /></Route>
            <Route path="/admin/users"><ProtectedRoute component={AdminUsers} /></Route>
            <Route path="/admin"><ProtectedRoute component={AdminDashboard} /></Route>

            <Route>
              <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                  <p className="text-gray-500 mb-6">Page not found</p>
                  <a href="/" className="text-primary hover:underline">Go back home</a>
                </div>
              </div>
            </Route>
          </Switch>
        </WorkspaceProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
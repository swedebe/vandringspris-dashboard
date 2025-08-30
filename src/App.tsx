import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Index461 from "./pages/Index461";
import Index114 from "./pages/Index114";
import ResultsStatistics from "./pages/ResultsStatistics";
import Export from "./pages/Export";
import Setup from "./pages/Setup";
import ConfigBanner from "./components/ConfigBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HelmetProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ConfigBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/index461" element={<Index461 />} />
              <Route path="/index114" element={<Index114 />} />
              <Route path="/results-statistics" element={<ResultsStatistics />} />
              <Route path="/export" element={<Export />} />
              <Route path="/setup" element={<Setup />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

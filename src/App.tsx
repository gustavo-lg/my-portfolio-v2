import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter } from "react-router-dom";
import { ExperienceProvider } from "@/experience/machine/useExperienceMachine";
import { OrbitalExperience } from "@/experience/OrbitalExperience";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <ExperienceProvider>
      <BrowserRouter>
        <OrbitalExperience />
      </BrowserRouter>
    </ExperienceProvider>
  </TooltipProvider>
);

export default App;

// This file ensures Tailwind includes all necessary classes in production
// By referencing them explicitly

export const tailwindSafelist = [
  // Backgrounds
  'bg-white/10',
  'bg-white/20', 
  'bg-white/30',
  'bg-white/50',
  'bg-white/70',
  'bg-gradient-to-br',
  'from-slate-900',
  'via-slate-800', 
  'to-slate-900',
  'min-h-screen',
  
  // Text
  'text-white',
  'text-white/60',
  'text-white/70',
  'text-white/50',
  'text-primary-400',
  'text-primary-500',
  'text-primary-600',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'font-semibold',
  'font-bold',
  'font-medium',
  
  // Layout
  'flex',
  'items-center',
  'justify-between',
  'grid',
  'grid-cols-1',
  'md:grid-cols-2',
  'lg:grid-cols-3',
  'lg:grid-cols-4',
  'gap-4',
  'gap-6',
  'space-y-6',
  'p-4',
  'p-6',
  'px-4',
  'py-2',
  'py-3',
  'mt-1',
  'mt-2',
  'mb-4',
  'ml-2',
  
  // Glass effect
  'backdrop-blur-sm',
  'backdrop-blur-lg',
  'backdrop-blur-md',
  'bg-white/10',
  'bg-white/5',
  'bg-white/20',
  'hover:bg-white/10',
  'hover:bg-white/30',
  'border',
  'border-white/10',
  'border-white/20',
  'border-white/30',
  'rounded-xl',
  'rounded-2xl',
  'shadow-xl',
  
  // Buttons
  'transition-all',
  'duration-200',
  'hover:bg-white/30',
  
  // Form inputs
  'focus:outline-none',
  'focus:border-primary-400',
  'placeholder-white/50',
  
  // Cards
  'glass-card',
  'glass-button',
  'glass-button-primary',
  'glass-input',
];

// Export empty to make it a module
export default {};

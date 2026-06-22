function Heading({ children, className }) {
  return (
    <h1
      className={`${className} text-8xl font-bold flex w-full items-center justify-center text-center py-6 tracking-[-0.065em] `}
    >
      {children}
    </h1>
  );
}

export { Heading };

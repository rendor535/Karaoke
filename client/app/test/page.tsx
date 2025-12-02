export default function TestPage() {
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold text-primary">Test Primary Color</h1>

      <div className="mt-5 p-6 rounded-xl bg-secondary text-secondary-foreground">
        Box z secondary
      </div>

      <div className="mt-5 p-6 rounded-xl bg-card text-card-foreground">
        Box z card
      </div>
    </div>
  );
}

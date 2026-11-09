import UrlForm from "./UrlForm";

export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <h1 className="mb-2 text-center text-4xl font-bold text-slate-900">
        Scanwick
      </h1>
      <p className="mb-10 text-center text-slate-500">
        Audit any website: performance first, more checks coming.
      </p>
      <UrlForm />
    </main>
  );
}

import Layout from "./components/Layout";
import UrlForm from "./UrlForm";

export default function App() {
  return (
    <Layout>
      <h1 className="mb-2 text-center text-3xl font-bold text-slate-900 sm:text-4xl">
        Audit any website
      </h1>
      <p className="mb-8 text-center text-slate-500">
        Paste a URL to see its mobile performance and what to fix first.
      </p>
      <UrlForm />
    </Layout>
  );
}

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export default function SubmitInvoice() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 ml-64">
        <Header 
          title="Submit Invoice"
          subtitle="Upload and validate B2B invoices for FIRS MBS integration"
        />
        
        <main className="p-6">
          <InvoiceForm />
        </main>
      </div>
    </div>
  );
}

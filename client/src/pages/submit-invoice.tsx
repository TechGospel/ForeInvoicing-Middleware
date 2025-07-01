import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export default function SubmitInvoice() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Submit Invoice</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Upload and process invoices through FIRS MBS
          </p>
        </div>
      </div>
      
      <InvoiceForm />
    </div>
  );
}

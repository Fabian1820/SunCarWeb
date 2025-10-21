// Type declarations for jspdf-autotable
// This allows TypeScript to recognize the autoTable function

import 'jspdf'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

declare module 'jspdf-autotable' {
  const autoTable: (doc: any, options: any) => void
  export default autoTable
}

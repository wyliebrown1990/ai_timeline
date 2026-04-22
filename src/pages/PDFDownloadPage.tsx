import { useState } from 'react';
import { Download, FileText, Check, Loader2, Calendar, Building, Tag } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SEO } from '../components/SEO';
import { useMilestones } from '../hooks';

/**
 * PDFDownloadPage - Generate and download AI timeline as PDF
 * Sprint TD-4: Linkable Assets
 */
function PDFDownloadPage() {
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { data: milestones, isLoading } = useMilestones();

  const generatePDF = async () => {
    if (!milestones || milestones.length === 0) return;

    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFillColor(249, 115, 22); // Orange-500
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Timeline', 14, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('The Complete History of Artificial Intelligence', 14, 30);

      // Subtitle with date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(`Generated on ${today}`, 14, 50);
      doc.text(`${milestones.length} milestones from 1943 to present`, 14, 56);

      // Stats summary
      const categories = [...new Set(milestones.map((m) => m.category))];
      const organizations = [...new Set(milestones.map((m) => m.organization).filter(Boolean))];
      doc.text(`Categories: ${categories.length} | Organizations: ${organizations.length}+`, 14, 62);

      // Sort milestones by date (newest first for the summary, oldest first for timeline)
      const sortedMilestones = [...milestones].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Create table data
      const tableData = sortedMilestones.map((m) => [
        new Date(m.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        m.title,
        m.category.replace('_', ' '),
        m.organization || '-',
        m.significance?.toString() || '-',
      ]);

      // Generate table
      autoTable(doc, {
        startY: 70,
        head: [['Date', 'Milestone', 'Category', 'Organization', 'Sig.']],
        body: tableData,
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 80 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 12, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237], // Orange-50
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          // Footer on each page
          const pageNumber = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          doc.text(
            'Source: letaiexplainai.com | CC BY 4.0',
            14,
            pageHeight - 10
          );
        },
      });

      // Save the PDF
      const filename = `AI-Timeline-LAEA-${new Date().getFullYear()}.pdf`;
      doc.save(filename);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Schema for SEO
  const documentSchema = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: 'Complete AI Timeline PDF',
    description: 'Comprehensive timeline of artificial intelligence history from 1943 to present, available as a free downloadable PDF.',
    url: 'https://letaiexplainai.com/timeline/download',
    encodingFormat: 'application/pdf',
    isAccessibleForFree: true,
    creator: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <>
      <SEO
        title="Download AI Timeline PDF - Free Printable Resource | LAEA"
        description="Download the complete AI timeline as a free PDF. Perfect for educators, researchers, and AI enthusiasts. Includes all milestones from 1943 to present. Updated monthly."
        canonical="https://letaiexplainai.com/timeline/download"
        jsonLd={documentSchema}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-500 to-amber-600 text-white py-16">
          <div className="container-main">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold mb-4">Download AI Timeline PDF</h1>
              <p className="text-xl text-orange-100">
                Get a printable version of the complete AI timeline. Perfect for
                classrooms, presentations, and offline reference.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container-main">
            <div className="max-w-2xl mx-auto">
              {/* Download Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <FileText className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      AI Timeline PDF
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Complete timeline in printable format
                    </p>
                  </div>
                </div>

                {/* Stats */}
                {isLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 mb-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading timeline data...
                  </div>
                ) : milestones ? (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {milestones.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Milestones</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Building className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Set(milestones.map((m) => m.organization).filter(Boolean)).size}+
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Organizations</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Tag className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Set(milestones.map((m) => m.category)).size}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Categories</div>
                    </div>
                  </div>
                ) : null}

                {/* What's Included */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    What's Included:
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Complete timeline from 1943 to present
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      All milestones with dates and descriptions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Organized by category and significance
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Print-ready formatting
                    </li>
                  </ul>
                </div>

                {/* Download Button */}
                <button
                  onClick={generatePDF}
                  disabled={generating || isLoading || !milestones}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all ${
                    downloaded
                      ? 'bg-green-500'
                      : generating || isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {downloaded ? (
                    <>
                      <Check className="h-5 w-5" />
                      Downloaded!
                    </>
                  ) : generating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Download PDF
                    </>
                  )}
                </button>

                <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                  Free download • No email required • CC BY 4.0 license
                </p>
              </div>

              {/* Usage Guidelines */}
              <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-3">
                  Usage Guidelines
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  This PDF is licensed under Creative Commons Attribution 4.0 (CC BY 4.0).
                  You are free to:
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Print and distribute in classrooms</li>
                  <li>• Include in presentations and reports</li>
                  <li>• Share with colleagues and students</li>
                  <li>• Use for commercial purposes</li>
                </ul>
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                  <strong>Attribution required:</strong> Please cite "Let AI Explain AI (letaiexplainai.com)"
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default PDFDownloadPage;

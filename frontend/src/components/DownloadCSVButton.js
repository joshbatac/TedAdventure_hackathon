import React from "react";

const DownloadCSVButton = () => {
  const handleDownload = () => {
    // Trigger the file download from the backend
    fetch("http://localhost:5000/download-fetchSwaps")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error downloading the file");
        }
        // Optionally, you can show a message or update state once the download starts
      })
      .catch((error) => {
        console.error("Error downloading the file:", error);
      });
  };

  return (
    <div>
      <button onClick={handleDownload}>Download fetchSwaps.csv</button>
    </div>
  );
};

export default DownloadCSVButton;

import { AppDispatch, RootState } from "@/store/store";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import apiClient from "@/services/axios.config";
import { setCommits } from "@/contexts/delta.slice";

interface TableSchemaProps {
  selectedTable: string;
}

const TableSchema = ({ selectedTable }: TableSchemaProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [dataToShow, setDataToShow] = useState<any>(null);

  let { allCommits, latestCommit } = useSelector(
    (state: RootState) => state.delta
  );
  const tableCred = useSelector(
    (state: RootState) => state.tableCred.tableCred
  );
  const basePath = useSelector((state: RootState) => state.tableCred.basePath);

  const dispatch = useDispatch<AppDispatch>();

  const handleDelta = async () => {
    setLoading(true);
    try {
      if (!allCommits.length) {
        const deltaDirectory = tableCred?.find(
          (t) => t.path.includes(selectedTable) // Instead of endsWith()
        );
        console.log("🚀 ~ handleDelta ~ deltaDirectory:", deltaDirectory);

        if (!deltaDirectory) {
          console.error("Delta directory not found");
          setLoading(false);
          return;
        }

        try {
          const path = deltaDirectory.path.replace(/\/$/, "");
          console.log("🚀 ~ handleDelta ~ path:", path);

          const commitResponse = await apiClient.post("/delta/commits", {
            deltaDirectory: path,
          });
          console.log("🚀 ~ handleDelta ~ commitResponse:", commitResponse);

          if (commitResponse.status === 200 && commitResponse.data.commits) {
            dispatch(
              setCommits({
                allCommits: commitResponse.data.commits.map(
                  (c: any) => c.fileName
                ),
                latestCommit: commitResponse.data.latestCommit.fileName,
                oldestCommit: commitResponse.data.oldestCommit.fileName,
              })
            );

            allCommits = commitResponse.data.commits.map(
              (c: any) => c.fileName
            );
            console.log("🚀 ~ handleDelta ~ allCommits:", allCommits);
            latestCommit = commitResponse.data.latestCommit.fileName;
            console.log("🚀 ~ handleDelta ~ latestCommit:", latestCommit);

            const fileDirectory = `${basePath}${selectedTable}/_delta_log/${latestCommit}`;

            console.log("🚀 ~ handleDelta ~ fileDirectory:", fileDirectory);
            const latestCommitResponse = await apiClient.post(
              "/delta/schema",
              fileDirectory
            );
            console.log(
              "🚀 ~ handleDelta ~ latestCommitResponse:",
              latestCommitResponse
            );

            if (latestCommitResponse.status === 200) {
              setDataToShow(latestCommitResponse.data.schema);
            } else {
              console.error("Failed to fetch latest commit schema.");
            }
          }
        } catch (error) {
          console.error("Error fetching delta table schema:", error);
          toast.error("Error fetching delta table schema.");
        }
      } else {
        const fileDirectory = `${basePath}${selectedTable}/_delta_log/${latestCommit}`;

        const latestCommitResponse = await apiClient.post(
          "/delta/schema",
          fileDirectory
        );

        if (latestCommitResponse.status === 200) {
          setDataToShow(latestCommitResponse.data.schema);
        } else {
          console.error("Failed to fetch latest commit schema.");
        }
      }
    } catch (error) {
      console.error("Error fetching delta table schema:", error);
      toast.error("Error fetching delta table schema.");
    } finally {
      setLoading(false);
    }
  };

  const handleHudi = async () => {
    setLoading(true);
    try {
      const hudi_table_path = selectedTable.split("/").filter(Boolean)[1];
      console.log("🚀 ~ handleHudi ~ hudi_table_path:", hudi_table_path);

      const response = await apiClient.post("/hudi/schema", {
        hudi_table_path: hudi_table_path,
      });
      console.log("🚀 ~ handleHudi ~ response:", response);

      if (response.status === 200) {
        setDataToShow(response.data.schema);
      } else {
        console.error("Failed to fetch Hudi table schema.");
      }
    } catch (error) {
      console.error("Error fetching Hudi table schema:", error);
      toast.error("Error fetching Hudi table schema.");
    } finally {
      setLoading(false);
    }
  };

  const handleIceberg = async () => {
    setLoading(true);
    try {
      const icebergPath = `${basePath}${selectedTable}`;
      console.log("🚀 ~ handleIceberg ~ icebergPath:", icebergPath);

      const response = await apiClient.post("/iceberg/schema", {
        icebergPath: icebergPath,
      });
      console.log("🚀 ~ handleIceberg ~ response:", response);

      if (response.status === 200) {
        setDataToShow(response.data.schema);
      } else {
        console.error("Failed to fetch Iceberg table schema.");
      }
    } catch (error) {
      console.error("Error fetching Iceberg table schema:", error);
      toast.error("Error fetching Iceberg table schema.");
    }
  };

  useEffect(() => {
    const table = tableCred?.find((t) => t.path.includes(selectedTable));

    if (table) {
      const { type } = table;
      if (type === "DELTA") {
        handleDelta();
      } else if (type === "HUDI") {
        handleHudi();
      } else if (type === "ICEBERG") {
        handleIceberg();
      }
    }
  }, [selectedTable]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Table Schema: {selectedTable}</h2>
      {dataToShow}
    </div>
  );
};

export default TableSchema;

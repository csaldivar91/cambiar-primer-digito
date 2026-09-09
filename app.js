(function () {
    var fileInput = document.getElementById("fileInput");
    var btnSelectFile = document.getElementById("btnSelectFile");
    var fileNameEl = document.getElementById("fileName");
    var searchStrings = document.getElementById("searchStrings");
    var chainCount = document.getElementById("chainCount");
    var newDigitInput = document.getElementById("newDigit");
    var digitError = document.getElementById("digitError");
    var btnProcess = document.getElementById("btnProcess");
    var statusMessage = document.getElementById("statusMessage");
    var resultsSection = document.getElementById("resultsSection");
    var resultsSummary = document.getElementById("resultsSummary");
    var resultsDetails = document.getElementById("resultsDetails");
    var downloadSection = document.getElementById("downloadSection");
    var btnDownload = document.getElementById("btnDownload");

    var selectedFile = null;
    var processedContent = null;
    var downloadFileName = "";

    btnSelectFile.addEventListener("click", function () {
        fileInput.click();
    });

    fileInput.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (file) {
            selectedFile = file;
            fileNameEl.textContent = file.name;
            fileNameEl.classList.add("has-file");
        } else {
            selectedFile = null;
            fileNameEl.textContent = "Ningún archivo seleccionado";
            fileNameEl.classList.remove("has-file");
        }
        updateButtonState();
    });

    searchStrings.addEventListener("input", function () {
        updateChainCount();
        updateButtonState();
    });

    newDigitInput.addEventListener("input", function () {
        validateDigit();
        updateButtonState();
    });

    btnProcess.addEventListener("click", handleProcess);
    btnDownload.addEventListener("click", handleDownload);

    function getChains() {
        return searchStrings.value
            .split("\n")
            .map(function (s) {
                return s.trim();
            })
            .filter(function (s) {
                return s.length > 0;
            });
    }

    function updateChainCount() {
        var chains = getChains();
        var n = chains.length;
        chainCount.textContent =
            n + " cadena" + (n !== 1 ? "s" : "") + " ingresada" + (n !== 1 ? "s" : "");
    }

    function validateDigit() {
        var val = newDigitInput.value;
        if (val.length > 0 && !/^\d$/.test(val)) {
            digitError.classList.remove("hidden");
            newDigitInput.classList.add("error");
        } else {
            digitError.classList.add("hidden");
            newDigitInput.classList.remove("error");
        }
    }

    function updateButtonState() {
        var chains = getChains();
        var digit = newDigitInput.value;
        var validDigit = /^\d$/.test(digit);
        btnProcess.disabled = !(selectedFile && chains.length > 0 && validDigit);
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = "status-message " + type;
    }

    function hideStatus() {
        statusMessage.className = "status-message hidden";
    }

    function handleProcess() {
        if (!selectedFile) return;
        var chains = getChains();
        if (chains.length === 0) return;
        var digit = newDigitInput.value;
        if (!/^\d$/.test(digit)) return;

        hideStatus();
        resultsSection.classList.add("hidden");
        downloadSection.classList.add("hidden");
        btnProcess.disabled = true;
        btnProcess.textContent = "PROCESANDO...";

        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var content = e.target.result;
                var result = processContent(content, chains, digit);

                processedContent = result.content;
                downloadFileName = generateDownloadName(selectedFile.name);

                showResults(result);
                downloadSection.classList.remove("hidden");
                showStatus("Archivo procesado correctamente.", "success");
            } catch (err) {
                showStatus("Error durante el procesamiento: " + err.message, "error");
            }
            btnProcess.disabled = false;
            btnProcess.textContent = "CAMBIAR PRIMER DÍGITO";
            updateButtonState();
        };

        reader.onerror = function () {
            showStatus("No se pudo leer el archivo.", "error");
            btnProcess.disabled = false;
            btnProcess.textContent = "CAMBIAR PRIMER DÍGITO";
            updateButtonState();
        };

        reader.readAsText(selectedFile, "UTF-8");
    }

    function processContent(content, chains, newDigit) {
        var lineRegex = /[^\r\n]*(?:\r\n|\r|\n)?/g;
        var rawLines = content.match(lineRegex) || [];

        var counts = {};
        chains.forEach(function (c) {
            counts[c] = 0;
        });

        var modifiedCount = 0;
        var processedLines = [];

        for (var i = 0; i < rawLines.length; i++) {
            var rawLine = rawLines[i];
            var contentEnd = rawLine.length;

            if (rawLine.endsWith("\r\n")) {
                contentEnd -= 2;
            } else if (rawLine.endsWith("\r") || rawLine.endsWith("\n")) {
                contentEnd -= 1;
            }

            var lineContent = rawLine.substring(0, contentEnd);
            var lineEnding = rawLine.substring(contentEnd);

            if (lineContent.length === 0) {
                processedLines.push(rawLine);
                continue;
            }

            var matched = false;
            for (var j = 0; j < chains.length; j++) {
                if (lineContent.indexOf(chains[j]) !== -1) {
                    counts[chains[j]]++;
                    matched = true;
                }
            }

            if (matched) {
                var newLine = newDigit + lineContent.substring(1);
                processedLines.push(newLine + lineEnding);
                modifiedCount++;
            } else {
                processedLines.push(rawLine);
            }
        }

        return {
            content: processedLines.join(""),
            totalLines: rawLines.length,
            modifiedLines: modifiedCount,
            counts: counts,
        };
    }

    function showResults(result) {
        var summary =
            "Líneas analizadas: " + result.totalLines + "\n";
        summary += "Líneas modificadas: " + result.modifiedLines;
        resultsSummary.textContent = summary;

        var detailsHtml = "";
        var chains = Object.keys(result.counts);
        for (var i = 0; i < chains.length; i++) {
            var chain = chains[i];
            var count = result.counts[chain];
            detailsHtml += '<div class="result-line">';
            detailsHtml += '<span class="chain">' + escapeHtml(chain) + "</span>";
            detailsHtml += " → ";
            detailsHtml +=
                '<span class="count' +
                (count === 0 ? " zero" : "") +
                '">' +
                count +
                " coincidencia" +
                (count !== 1 ? "s" : "") +
                "</span>";
            detailsHtml += "</div>";
        }
        resultsDetails.innerHTML = detailsHtml;
        resultsSection.classList.remove("hidden");
    }

    function escapeHtml(str) {
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function generateDownloadName(originalName) {
        var lastDot = originalName.lastIndexOf(".");
        if (lastDot > 0) {
            var name = originalName.substring(0, lastDot);
            var ext = originalName.substring(lastDot);
            if (name.indexOf("_modificado") === name.length - "_modificado".length) {
                return originalName;
            }
            return name + "_modificado" + ext;
        }
        if (originalName.indexOf("_modificado") === originalName.length - "_modificado".length) {
            return originalName;
        }
        return originalName + "_modificado";
    }

    function handleDownload() {
        if (!processedContent) return;

        var blob = new Blob([processedContent], {
            type: "text/plain;charset=UTF-8",
        });
        var url = URL.createObjectURL(blob);

        var a = document.createElement("a");
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 100);
    }
})();

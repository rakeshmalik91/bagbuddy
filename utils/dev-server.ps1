<#
Runs the Vite dev server so that closing the terminal always stops it.

Windows only terminates the processes attached to a console when the window
itself is closed. A shell that is merely killed, which is what closing a terminal
tab or a task runner does, leaves its children running, and the dev server
outlives the window.

Tying the server to a job object with KILL_ON_JOB_CLOSE fixes that: the handle
belongs to this script, so the moment the script goes away for any reason, the
kernel closes the handle and takes the server with it. The handle is
deliberately never closed while the script runs.
#>

param(
    # Matches server.port in webapp/vite.config.ts, which is strict about clashes.
    [int]$Port = 5173,
    # Just stop whatever is on the port and leave, for run.bat to call on Ctrl+C.
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'

$webapp = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\webapp'))
Set-Location $webapp

function Stop-ProcessTree([int]$ProcessId) {
    & taskkill.exe /F /T /PID $ProcessId | Out-Null
}

function Get-ListeningProcess {
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Select-Object -First 1
        return $connection.OwningProcess
    } catch {
        # Older Windows without Get-NetTCPConnection: read it off netstat.
        $line = & netstat.exe -ano -p TCP |
            Select-String -Pattern (":$Port\s+.*LISTENING\s+(\d+)$") |
            Select-Object -First 1
        if ($line -and $line.Matches.Count -gt 0) { return [int]$line.Matches[0].Groups[1].Value }
        return $null
    }
}

function Stop-DevServer {
    $stale = Get-ListeningProcess
    if ($stale) {
        Stop-ProcessTree $stale
        return $true
    }
    return $false
}

if ($Stop) {
    if (Stop-DevServer) { Write-Host "[run] Stopped the dev server on port $Port." }
    else { Write-Host "[run] Nothing was running on port $Port." }
    exit 0
}

# A server left behind by an earlier window would only make this one fail to
# bind the port, so hand the port over first.
if (Stop-DevServer) {
    Write-Host "[run] Port $Port was still held by an earlier dev server, stopping it."
    Start-Sleep -Milliseconds 500
}

if (-not (Test-Path 'node_modules')) {
    Write-Host '[run] Installing dependencies...'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[run] npm install failed.'
        exit 1
    }
}

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class KillOnCloseJob
{
    const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    const int JobObjectExtendedLimitInformation = 9;

    [StructLayout(LayoutKind.Sequential)]
    struct IoCounters
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct BasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct ExtendedLimitInformation
    {
        public BasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(
        IntPtr job, int infoClass, ref ExtendedLimitInformation info, uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    /// <summary>A job that kills everything in it when the last handle closes.</summary>
    public static IntPtr Create()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());

        var info = new ExtendedLimitInformation();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        uint size = (uint)Marshal.SizeOf(typeof(ExtendedLimitInformation));
        if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, ref info, size))
        {
            int code = Marshal.GetLastWin32Error();
            Destroy(job);
            throw new Win32Exception(code);
        }
        return job;
    }

    /// <summary>Closes the handle, which ends the job and kills its members.</summary>
    public static void Destroy(IntPtr job)
    {
        if (job != IntPtr.Zero) CloseHandle(job);
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr handle);
}
'@

$arguments = @('run', 'dev:open')
if ($PSBoundParameters.ContainsKey('Port')) {
    $arguments += @('--', '--port', "$Port")
}

Write-Host "[run] Starting the dev server on http://localhost:$Port/. Your browser will open once it is ready."
Write-Host '[run] Closing this window stops the server.'
Write-Host ''

$server = Start-Process -FilePath 'npm.cmd' -ArgumentList $arguments -PassThru -NoNewWindow

$job = $null
try {
    $job = [KillOnCloseJob]::Create()
    if ([KillOnCloseJob]::AssignProcessToJobObject($job, $server.Handle)) {
        Write-Host '[run] The server is tied to this window.'
    } else {
        $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Warning "Could not tie the server to this window ($code). Stop it with Ctrl+C."
    }
} catch {
    Write-Warning "Could not tie the server to this window: $($_.Exception.Message). Stop it with Ctrl+C."
}

$server.WaitForExit()
exit $server.ExitCode
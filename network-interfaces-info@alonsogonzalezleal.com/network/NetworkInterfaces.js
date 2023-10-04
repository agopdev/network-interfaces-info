const Gio = imports.gi.Gio;

function execCommunicate(argv) {
    const flags = (Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

    const proc = Gio.Subprocess.new(argv, flags);

    return new Promise((resolve, reject) => {
        proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                let status = proc.get_exit_status();

                if (status !== 0) {
                    reject(new Gio.IOErrorEnum({
                        code: Gio.io_error_from_errno(status),
                        message: stderr ? stderr.trim() : Gio.strerror(status)
                    }));
                } else {
                    resolve(stdout.trim());
                }
            } catch (e) {
                reject(e);
            }
        });
    });
}

function getAllNetworkCardInterfaces() {
    const command = ["/bin/bash", "-c", "ip -o link show | awk -F': ' '{print $2}'"];
    return execCommunicate(command);
}

function getInterfaceInfo(interface_name) {
    const interface_status_command = ['/bin/bash', '-c', `ip a show ${interface_name} | grep -oP 'state [^ ]* ' | awk '{print $2}'`];
    const ipv4_command = ['/bin/bash', '-c', `ip a show ${interface_name} | grep 'inet [^ ]* brd' | awk '{print $2}'`];
    const ipv6_command = ['/bin/bash', '-c', `ip a show ${interface_name} | grep 'inet6 [^ ]* scope' | awk '{print $2}'`];
    const current_mac_address_command = ['/bin/bash', '-c', `ip a show ${interface_name} | grep 'link/ether [^ ]* brd' | awk '{print $2}'`];
    const permanent_mac_address_command = ['/bin/bash', '-c', `ip a show ${interface_name} | grep -oP 'permaddr [^ ]*' | awk '{print $2}'`];
    const ipv4_mode_command = ['/bin/bash', '-c', `ip a | grep 'inet' | grep -q 'dynamic' && echo "Dynamic" || echo "Static"`];
    const ipv6_mode_command = ['/bin/bash', '-c', `ip a | grep 'inet' | grep -q 'dynamic' && echo "Dynamic" || echo "Static"`];

    return Promise.all([
        execCommunicate(interface_status_command),
        execCommunicate(ipv4_command),
        execCommunicate(ipv4_mode_command),
        execCommunicate(ipv6_command),
        execCommunicate(ipv6_mode_command),
        execCommunicate(current_mac_address_command),
        execCommunicate(permanent_mac_address_command)
    ]).then(([interface_status, ipv4, ipv4_mode, ipv6, ipv6_mode, current_mac_address, permanent_mac_address]) => {
        const interface_info = `${interface_status[0]}${interface_status.slice(1, interface_status.length).toLowerCase()}\n${ipv4}\n${ipv4_mode}\n${ipv6}\n${ipv6_mode}\n${current_mac_address}\n${permanent_mac_address}`;
        return interface_info;
    });
}
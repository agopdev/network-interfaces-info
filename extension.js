const GETTEXT_DOMAIN = 'network-interfaces-info@alonsogonzalezleal.com';

const { GObject, St, Clutter } = imports.gi;
const { getCurrentExtension, getSettings } = imports.misc.extensionUtils;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;

const _ = ExtensionUtils.gettext;

const { getAllNetworkCardInterfaces, getInterfaceInfo } = getCurrentExtension().imports.network.NetworkInterfaces;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Network Interfaces Info'));

        const gicon = Gio.icon_new_for_string(getCurrentExtension().path + '/icons/network-card-icon.svg');

        this.add_child(new St.Icon({
            gicon,
            style_class: 'system-status-icon'
        }));

        const item_refresh = new PopupMenu.PopupMenuItem(_(`Refresh`));
        item_refresh.connect('activate', () => this._loadNetworkCardInfo());
        this.menu.addMenuItem(item_refresh);

        this._loadNetworkCardInfo();
    }

    async _loadNetworkCardInfo() {
        try {
            const interfaces_array = await getAllNetworkCardInterfaces();
            log(`Interfaces: ${interfaces_array}`);

            this.menu.removeAll();

            const item_refresh = new PopupMenu.PopupMenuItem(_(`Refresh`));
            item_refresh.connect('activate', () => this._loadNetworkCardInfo());
            this.menu.addMenuItem(item_refresh);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            for (const interface_name of interfaces_array.split('\n')) {
                const submenu = new PopupMenu.PopupSubMenuMenuItem(_(interface_name));
                this.menu.addMenuItem(submenu);

                let interface_info_array;

                try {
                    interface_info_array = (await getInterfaceInfo(interface_name)).split('\n');
                    interface_info_array = interface_info_array.map(interface_data => {
                        return interface_data.trim() === '' ? 'Unknown' : interface_data;
                    });
                } catch (error) {
                    log(`Error ${error.message}`);
                    interface_info_array = Array(7).fill('Unknown');
                }

                const item_interface_status = new PopupMenu.PopupMenuItem(_(`Status: ${interface_info_array[0]}`));
                const item_ipv4 = new PopupMenu.PopupMenuItem(_(`IPv4: ${interface_info_array[1]}`));
                const item_ipv4_mode = new PopupMenu.PopupMenuItem(_(`IPv4 Mode: ${interface_info_array[2]}`));
                const item_ipv6 = new PopupMenu.PopupMenuItem(_(`IPv6: ${interface_info_array[3]}`));
                const item_ipv6_mode = new PopupMenu.PopupMenuItem(_(`IPv6 Mode: ${interface_info_array[4]}`));
                const item_current_mac_address = new PopupMenu.PopupMenuItem(_(`Current MAC Address: ${interface_info_array[5]}`));
                const item_permanent_mac_address = new PopupMenu.PopupMenuItem(_(`Permanent MAC Address: ${interface_info_array[6]}`));

                submenu.menu.addMenuItem(item_interface_status);
                submenu.menu.addMenuItem(item_ipv4);
                submenu.menu.addMenuItem(item_ipv4_mode);
                submenu.menu.addMenuItem(item_ipv6);
                submenu.menu.addMenuItem(item_ipv6_mode);
                submenu.menu.addMenuItem(item_current_mac_address);
                submenu.menu.addMenuItem(item_permanent_mac_address);
            }
        } catch (error) {
            log(`Error: ${error.message}`);
        }
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

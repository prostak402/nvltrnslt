init -999 python:
    import json
    import os
    import ssl
    import re
    try:
        import urllib.request as lex_urllib_request
        import urllib.error as lex_urllib_error
    except ImportError:
        import urllib2 as lex_urllib_request
        import urllib2 as lex_urllib_error

    try:
        lex_text_type = unicode
    except NameError:
        lex_text_type = str

    # --- Совместимость для Ren'Py < 7.7 / 8.2: CopyToClipboard может отсутствовать ---
    # В Ren'Py 8.1.x это норма, поэтому добавляем экшен сами.
    if "CopyToClipboard" not in globals():
        try:
            from renpy.display.behavior import Function
        except Exception:
            pass

        def _lex_clipboard_put(text):
            text = "" if text is None else str(text)

            # 1) Если в сборке есть готовая функция Ren'Py — используем её.
            for fn_name in ("set_clipboard", "set_clipboard_text", "copy_to_clipboard"):
                fn = getattr(renpy, fn_name, None)
                if callable(fn):
                    try:
                        fn(text)
                        return
                    except Exception:
                        pass

            # 2) Фоллбек через pygame_sdl2.scrap (обычно работает на Windows/macOS/Linux).
            try:
                import pygame_sdl2
                import pygame_sdl2.scrap as scrap

                try:
                    if hasattr(scrap, "init"):
                        scrap.init()
                    if hasattr(scrap, "set_mode"):
                        mode = getattr(pygame_sdl2, "SCRAP_CLIPBOARD", None)
                        if mode is None:
                            mode = getattr(scrap, "SCRAP_CLIPBOARD", None)
                        if mode is not None:
                            scrap.set_mode(mode)
                except Exception:
                    pass

                t = getattr(scrap, "SCRAP_TEXT", None)
                if t is None:
                    t = getattr(pygame_sdl2, "SCRAP_TEXT", None)

                data = text.encode("utf-8")

                if t is not None:
                    scrap.put(t, data)
                else:
                    # некоторые сборки принимают mime-строки
                    scrap.put("text/plain;charset=utf-8", data)
            except Exception:
                pass

        def CopyToClipboard(s):
            return Function(_lex_clipboard_put, s)


    def lex_urlopen_insecure(req, timeout=8):
        try:
            ctx = ssl._create_unverified_context()
        except Exception:
            ctx = None
        if ctx is not None:
            try:
                return lex_urllib_request.urlopen(req, timeout=timeout, context=ctx)
            except TypeError:
                pass
        return lex_urllib_request.urlopen(req, timeout=timeout)

    def lex_to_text(value):
        if value is None:
            return ""
        if isinstance(value, bytes):
            for enc in ("utf-8", "utf-16", "latin-1"):
                try:
                    return value.decode(enc).replace("\x00", "")
                except Exception:
                    pass
            return ""
        try:
            if isinstance(value, lex_text_type):
                return value
        except Exception:
            pass
        try:
            return lex_text_type(value)
        except Exception:
            try:
                return str(value)
            except Exception:
                return ""

    LEX_ACTIVATION_FILE = "nvl_translate_key.json"
    LEX_DEFAULT_API_BASE = "__LEX_DEFAULT_API_BASE__"

    def lex_default_api_base():
        base = lex_to_text(LEX_DEFAULT_API_BASE).strip()
        if (not base) or ((not base.startswith("http://")) and (not base.startswith("https://"))):
            base = "http://localhost:3000"
        while base.endswith("/"):
            base = base[:-1]
        return base

    def lex_api_base_url():
        base = getattr(persistent, "lex_api_base", lex_default_api_base())
        base = lex_to_text(base).strip()
        if not base:
            base = lex_default_api_base()
        while base.endswith("/"):
            base = base[:-1]
        return base

    def lex_request_json(path, payload=None, device_token=None, timeout=8):
        url = lex_api_base_url() + path
        headers = {
            "Accept": "application/json",
        }
        data = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload).encode("utf-8")

        token = (device_token or getattr(persistent, "lex_device_token", "") or "").strip()
        if token:
            headers["X-Device-Token"] = token

        req = lex_urllib_request.Request(url, data=data, headers=headers)

        response = None
        try:
            response = lex_urlopen_insecure(req, timeout=timeout)
            raw = response.read()
        except lex_urllib_error.HTTPError as e:
            raw = ""
            try:
                raw = lex_to_text(e.read())
            except Exception:
                pass
            try:
                payload = json.loads(raw or "{}")
            except Exception:
                payload = {}
            err = ""
            if isinstance(payload, dict):
                err = lex_to_text(payload.get("error")).strip()
            if not err:
                err = "HTTP %s" % getattr(e, "code", "?")
            return None, err
        except lex_urllib_error.URLError as e:
            return None, "Network error: %s" % lex_to_text(e)
        except Exception as e:
            return None, "Exception: %s" % lex_to_text(repr(e))
        finally:
            try:
                if response:
                    response.close()
            except Exception:
                pass

        raw_text = lex_to_text(raw).replace(u"\ufeff", "").strip()
        payload = None
        candidates = []
        if raw_text:
            candidates.append(raw_text)
            start = raw_text.find("{")
            end = raw_text.rfind("}")
            if (start >= 0) and (end > start):
                snippet = raw_text[start:end+1]
                if snippet != raw_text:
                    candidates.append(snippet)

        for candidate in candidates:
            try:
                parsed = json.loads(candidate or "{}")
            except Exception:
                parsed = None
            if type(parsed) is dict:
                payload = parsed
                break
            if (type(parsed) is list) and parsed and (type(parsed[0]) is dict):
                payload = parsed[0]
                break

        if type(payload) is not dict:
            payload = lex_parse_api_fallback(path, raw_text)

        if type(payload) is not dict:
            if not raw_text:
                return None, "Empty API response"
            preview = raw_text[:160].replace("\n", " ").replace("\r", " ").replace("{", "(").replace("}", ")")
            return None, "Bad API response: %s" % preview

        if not payload.get("ok", False):
            return None, lex_to_text(payload.get("error")).strip() or "Request failed"
        return payload.get("data", None), ""

    def lex_yc_load_secret():
        try:
            if renpy.loadable("lex_yc_secret.json"):
                f = renpy.file("lex_yc_secret.json")
                data = f.read()
                try:
                    data = data.decode("utf-8")
                except Exception:
                    pass
                js = json.loads(data)
                return (js.get("folder_id") or "").strip(), (js.get("api_key") or "").strip()
        except Exception:
            pass
        return "", ""

    def lex_extract_translation_from_raw(raw):
        raw = raw or ""
        m = re.search(r'"text"\s*:\s*"((?:\\.|[^"\\])*)"', raw)
        if not m:
            return ""
        s = m.group(1)
        try:
            s = json.loads('"{}"'.format(s))
        except Exception:
            try:
                s = json.loads(u'"%s"' % s)
            except Exception:
                pass
        return (s or "").strip()

    def lex_run_in_thread(fn, *args):
        inv = getattr(renpy, "invoke_in_thread", None)
        if callable(inv):
            try:
                inv(fn, *args)
                return True
            except Exception:
                pass

        try:
            import threading
            worker = threading.Thread(target=fn, args=args)
            worker.daemon = True
            worker.start()
            return True
        except Exception:
            return False

    def lex_clear_input_focus():
        try:
            import renpy.display.focus as _f
            if hasattr(_f, "clear_focus"):
                _f.clear_focus()
        except Exception:
            pass

    def lex_translate_yc(text, target="ru"):
        store.lex_translate_error = ""
        text = (text or "").strip()
        if not text:
            store.lex_translate_error = "empty text"
            return ""

        if len(text) > 10000:
            text = text[:10000]

        if target != "ru":
            store.lex_translate_error = "only ru target is supported"
            return ""

        token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if not token:
            lex_try_auto_activate(False)
            token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if not token:
            store.lex_translate_error = "Положите nvl_translate_key.json в папку game/"
            return ""

        data, err = lex_request_json("/api/mod/translate", {"text": text}, token)
        if err and lex_is_device_auth_error(err):
            persistent.lex_device_token = ""
            if lex_try_auto_activate(False):
                token = (getattr(persistent, "lex_device_token", "") or "").strip()
                data, err = lex_request_json("/api/mod/translate", {"text": text}, token)
        if err:
            persistent.lex_last_sync_error = err
            store.lex_translate_error = err
            return ""

        translation = ""
        if type(data) is dict:
            translation = (lex_to_text(data.get("translation")) or "").strip()
        if not translation:
            store.lex_translate_error = "Empty translation from server"
            return ""

        persistent.lex_last_sync_error = ""
        return translation

    def lex_translate_to_input(iv):
        src = (store.lex_selected or "").strip()
        if not src:
            renpy.notify("Нечего переводить")
            return

        tr = lex_translate_yc(src, "ru")
        if not tr:
            tr = lex_extract_translation_from_raw(store.lex_translate_error or "")
            tr = (tr or "").strip()

        if not tr:
            renpy.notify(store.lex_translate_error or "Перевод не получился")
            return

        store.lex_edit_tr = tr

        try:
            iv.set_text(tr)
        except Exception:
            pass

        try:
            import renpy.display.focus as _f
            if hasattr(_f, "clear_focus"):
                _f.clear_focus()
        except Exception:
            pass

        renpy.restart_interaction()

    def lex_translate_current():
        src = (store.lex_selected or "").strip()
        if not src:
            renpy.notify("Нечего переводить")
            return

        tr = lex_translate_yc(src, "ru")
        if not tr:
            tr = lex_extract_translation_from_raw(store.lex_translate_error or "")
            tr = (tr or "").strip()

        if not tr:
            renpy.notify(store.lex_translate_error or "Перевод не получился")
            return

        store.lex_edit_tr = tr
        renpy.restart_interaction()

    def lex_complete_translation(translation, error, notify_on_error=True):
        tr = (translation or "").strip()
        if not tr:
            tr = lex_extract_translation_from_raw(error or "")
            tr = (tr or "").strip()

        if not tr:
            if error:
                store.lex_translate_error = error
                persistent.lex_last_sync_error = error
            if notify_on_error:
                renpy.notify(error or "Translation failed")
            return False

        store.lex_translate_error = ""
        persistent.lex_last_sync_error = ""
        store.lex_edit_tr = tr
        lex_clear_input_focus()
        return True

    def lex_translate_worker(text, target, job_id):
        translation = ""
        error = ""
        try:
            translation = lex_translate_yc(text, target)
            error = lex_to_text(getattr(store, "lex_translate_error", "")).strip()
        except Exception as e:
            error = "Exception: %s" % lex_to_text(repr(e))

        store.lex_translate_async_result = {
            "job_id": job_id,
            "translation": translation or "",
            "error": error or "",
        }

    def lex_poll_translate_job():
        payload = getattr(store, "lex_translate_async_result", None)
        if type(payload) is not dict:
            return

        current_job_id = int(getattr(store, "lex_translate_job_id", 0) or 0)
        if int(payload.get("job_id", 0) or 0) != current_job_id:
            store.lex_translate_async_result = None
            return

        store.lex_translate_async_result = None
        store.lex_translate_busy = False
        lex_complete_translation(payload.get("translation", ""), payload.get("error", ""))
        renpy.restart_interaction()

    def lex_translate_to_input(iv=None):
        src = (store.lex_selected or "").strip()
        if not src:
            renpy.notify("Nothing to translate")
            return

        if getattr(store, "lex_translate_busy", False):
            renpy.notify("Translation already in progress")
            return

        store.lex_translate_error = ""
        store.lex_translate_async_result = None
        store.lex_translate_busy = True
        store.lex_translate_job_id = int(getattr(store, "lex_translate_job_id", 0) or 0) + 1
        job_id = store.lex_translate_job_id

        if lex_run_in_thread(lex_translate_worker, src, "ru", job_id):
            renpy.restart_interaction()
            return

        store.lex_translate_busy = False
        tr = lex_translate_yc(src, "ru")
        lex_complete_translation(tr, store.lex_translate_error or "")
        renpy.restart_interaction()

    def lex_translate_current():
        lex_translate_to_input()

    def lex_clipboard_text():
        for fn_name in ("get_clipboard", "get_clipboard_text"):
            fn = getattr(renpy, fn_name, None)
            if callable(fn):
                try:
                    v = fn()
                    if v:
                        return v if isinstance(v, str) else str(v)
                except Exception:
                    pass

        try:
            import pygame_sdl2
            import pygame_sdl2.scrap as scrap

            try:
                if hasattr(scrap, "init"):
                    scrap.init()
                if hasattr(scrap, "set_mode"):
                    mode = getattr(pygame_sdl2, "SCRAP_CLIPBOARD", None)
                    if mode is None:
                        mode = getattr(scrap, "SCRAP_CLIPBOARD", None)
                    if mode is not None:
                        scrap.set_mode(mode)
            except Exception:
                pass

            t = getattr(scrap, "SCRAP_TEXT", None)
            if t is None:
                t = getattr(pygame_sdl2, "SCRAP_TEXT", None)

            data = None
            try:
                if t is not None:
                    data = scrap.get(t)
            except Exception:
                data = None

            if data is None:
                try:
                    data = scrap.get("text/plain;charset=utf-8")
                except Exception:
                    data = None

            if not data:
                return ""

            if isinstance(data, bytes):
                for enc in ("utf-8", "utf-16", "latin-1"):
                    try:
                        return data.decode(enc).replace("\x00", "").strip()
                    except Exception:
                        pass
                return ""
            return data if isinstance(data, str) else str(data)

        except Exception:
            return ""

    def lex_paste_to(varname):
        s = (lex_clipboard_text() or "").strip()
        if not s:
            renpy.notify("Буфер пустой")
            return
        setattr(store, varname, s)
        renpy.restart_interaction()

    def lex_novel_title():
        title = ""
        try:
            title = getattr(config, "name", "") or ""
        except Exception:
            title = ""
        title = lex_to_text(title).strip()
        return title or "Ren'Py Novel"

    def lex_game_dir():
        try:
            return lex_to_text(getattr(config, "gamedir", "")).strip()
        except Exception:
            return ""

    def lex_activation_file_path():
        game_dir = lex_game_dir()
        if game_dir:
            try:
                direct_path = os.path.join(game_dir, LEX_ACTIVATION_FILE)
                if os.path.isfile(direct_path):
                    return direct_path
            except Exception:
                pass

            try:
                for entry in os.listdir(game_dir):
                    entry_text = lex_to_text(entry).strip()
                    entry_lower = entry_text.lower()
                    if entry_lower.startswith("nvl_translate_key") and entry_lower.endswith(".json"):
                        candidate = os.path.join(game_dir, entry_text)
                        if os.path.isfile(candidate):
                            return candidate
            except Exception:
                pass

        return ""

    def lex_is_device_auth_error(err):
        err = lex_to_text(err).strip().upper()
        return ("UNAUTHORIZED_DEVICE" in err) or ("UNAUTHORIZED" == err)

    def lex_activation_key_preview():
        key = lex_to_text(getattr(persistent, "lex_activation_key", "")).strip().upper()
        if not key:
            return "-"
        if len(key) <= 16:
            return key
        return "%s...%s" % (key[:12], key[-6:])

    def lex_activation_file_label():
        path = lex_activation_file_path()
        if path:
            try:
                return lex_to_text(os.path.basename(path)).strip() or LEX_ACTIVATION_FILE
            except Exception:
                pass
        return LEX_ACTIVATION_FILE

    def lex_extract_json_string(raw_text, field_name):
        raw_text = lex_to_text(raw_text).replace(u"\ufeff", "")
        field_name = re.escape(lex_to_text(field_name))
        m = re.search(r'"%s"\s*:\s*"((?:\\.|[^"\\])*)"' % field_name, raw_text)
        if not m:
            return ""
        value = m.group(1)
        try:
            return lex_to_text(json.loads(u'"%s"' % value))
        except Exception:
            return lex_to_text(value).replace('\\"', '"').replace("\\\\", "\\")

    def lex_extract_json_int(raw_text, field_name):
        raw_text = lex_to_text(raw_text)
        field_name = re.escape(lex_to_text(field_name))
        m = re.search(r'"%s"\s*:\s*(-?\d+)' % field_name, raw_text)
        if not m:
            return None
        try:
            return int(m.group(1))
        except Exception:
            return None

    def lex_extract_json_nullable_int(raw_text, field_name):
        raw_text = lex_to_text(raw_text)
        field_name = re.escape(lex_to_text(field_name))
        m_null = re.search(r'"%s"\s*:\s*null' % field_name, raw_text)
        if m_null:
            return None
        return lex_extract_json_int(raw_text, field_name)

    def lex_extract_json_bool(raw_text, field_name):
        raw_text = lex_to_text(raw_text)
        field_name = re.escape(lex_to_text(field_name))
        m = re.search(r'"%s"\s*:\s*(true|false)' % field_name, raw_text, re.I)
        if not m:
            return None
        return m.group(1).lower() == "true"

    def lex_parse_api_fallback(path, raw_text):
        raw_text = lex_to_text(raw_text).replace(u"\ufeff", "")
        ok_value = lex_extract_json_bool(raw_text, "ok")
        error_value = lex_extract_json_string(raw_text, "error").strip()

        if ok_value is False:
            return {
                "ok": False,
                "error": error_value or "Request failed",
            }

        if ok_value is not True:
            return None

        if path == "/api/mod/translate":
            translation = lex_extract_json_string(raw_text, "translation").strip()
            if not translation:
                return None
            return {
                "ok": True,
                "data": {
                    "translation": translation,
                },
            }

        if path == "/api/mod/bootstrap":
            plan = lex_extract_json_string(raw_text, "plan").strip() or "free"
            return {
                "ok": True,
                "data": {
                    "user": {
                        "name": lex_extract_json_string(raw_text, "name").strip(),
                        "email": lex_extract_json_string(raw_text, "email").strip(),
                        "plan": plan,
                    },
                    "plan": plan,
                    "usage": {
                        "count": lex_extract_json_int(raw_text, "count") or 0,
                        "limit": lex_extract_json_nullable_int(raw_text, "limit"),
                    },
                    "settings": {},
                },
            }

        if (path == "/api/mod/activate") or (path == "/api/mod/link"):
            device_token = lex_extract_json_string(raw_text, "deviceToken").strip()
            if not device_token:
                return None
            plan = lex_extract_json_string(raw_text, "plan").strip() or "free"
            return {
                "ok": True,
                "data": {
                    "deviceToken": device_token,
                    "user": {
                        "name": lex_extract_json_string(raw_text, "name").strip(),
                        "email": lex_extract_json_string(raw_text, "email").strip(),
                        "plan": plan,
                    },
                    "settings": {},
                    "features": {},
                    "plan": plan,
                    "quotas": {
                        "dailyTranslations": lex_extract_json_nullable_int(raw_text, "dailyTranslations"),
                    },
                },
            }

        if path == "/api/mod/items":
            return {
                "ok": True,
                "data": {
                    "itemId": lex_extract_json_int(raw_text, "itemId"),
                    "queued": lex_extract_json_bool(raw_text, "queued"),
                },
            }

        return None

    def lex_escape_text_tags(value):
        return lex_to_text(value).replace("{", "{{").replace("}", "}}")

    def lex_activation_file_present():
        if lex_activation_file_path():
            return True
        try:
            return renpy.loadable(LEX_ACTIVATION_FILE)
        except Exception:
            return False

    def lex_load_activation_file(notify=True, restart=True, apply_api_base=True):
        if not lex_activation_file_present():
            persistent.lex_last_sync_error = "Файл активации не найден в game/"
            store.lex_translate_error = persistent.lex_last_sync_error
            if notify:
                renpy.notify("Файл активации не найден в game/")
            if restart:
                renpy.restart_interaction()
            return False

        try:
            file_path = lex_activation_file_path()
            if file_path:
                f = open(file_path, "rb")
                raw = f.read()
                try:
                    f.close()
                except Exception:
                    pass
            else:
                f = renpy.file(LEX_ACTIVATION_FILE)
                raw = f.read()
            raw_text = lex_to_text(raw).replace(u"\ufeff", "")
            payload = json.loads(raw_text or "{}")
        except Exception:
            payload = {}
            raw_text = ""

        if type(payload) is not dict:
            payload = {}

        activation_key = lex_to_text(payload.get("activationKey")).strip().upper()
        api_base = lex_to_text(payload.get("apiBaseUrl")).strip()
        if (not activation_key) and raw_text:
            activation_key = lex_extract_json_string(raw_text, "activationKey").strip().upper()
        if (not api_base) and raw_text:
            api_base = lex_extract_json_string(raw_text, "apiBaseUrl").strip()
        if not activation_key:
            persistent.lex_last_sync_error = "Некорректный файл активации"
            store.lex_translate_error = persistent.lex_last_sync_error
            if notify:
                renpy.notify("Некорректный файл активации")
            if restart:
                renpy.restart_interaction()
            return False

        while api_base.endswith("/"):
            api_base = api_base[:-1]

        persistent.lex_activation_key = activation_key
        if api_base and apply_api_base:
            persistent.lex_api_base = api_base
            store.lex_api_base_edit = api_base

        persistent.lex_last_sync_error = ""
        store.lex_translate_error = ""
        if notify:
            renpy.notify("Файл активации загружен")
        if restart:
            renpy.restart_interaction()
        return True

    def lex_activate_with_key(activation_key=None, device_label=None, notify=True, restart=True):
        activation_key = lex_to_text(activation_key or getattr(persistent, "lex_activation_key", "")).strip().upper()
        device_label = lex_to_text(device_label or getattr(store, "lex_device_label_edit", "") or persistent.lex_device_label or "Ren'Py Device").strip() or "Ren'Py Device"

        if not activation_key:
            persistent.lex_last_sync_error = "Ключ активации не загружен"
            store.lex_translate_error = persistent.lex_last_sync_error
            if notify:
                renpy.notify("Ключ активации не загружен")
            if restart:
                renpy.restart_interaction()
            return False

        persistent.lex_api_base = (store.lex_api_base_edit or persistent.lex_api_base or "").strip() or lex_default_api_base()
        persistent.lex_device_label = device_label
        persistent.lex_activation_key = activation_key

        data, err = lex_request_json("/api/mod/activate", {
            "activationKey": activation_key,
            "deviceLabel": device_label,
        }, "")
        if err:
            persistent.lex_last_sync_error = err
            store.lex_translate_error = err
            if notify:
                renpy.notify(err)
            if restart:
                renpy.restart_interaction()
            return False

        token = ""
        if type(data) is dict:
            token = lex_to_text(data.get("deviceToken")).strip()
        if not token:
            persistent.lex_last_sync_error = "Сервер не вернул токен устройства"
            store.lex_translate_error = persistent.lex_last_sync_error
            if notify:
                renpy.notify("Сервер не вернул токен устройства")
            if restart:
                renpy.restart_interaction()
            return False

        persistent.lex_device_token = token
        persistent.lex_last_sync_error = ""
        store.lex_translate_error = ""
        lex_apply_remote_state(data)
        if notify:
            renpy.notify("Устройство активировано")
        if restart:
            renpy.restart_interaction()
        return True

    def lex_activate_from_file(notify=True, restart=True):
        if not lex_load_activation_file(notify, False):
            if restart:
                renpy.restart_interaction()
            return False

        ok = lex_activate_with_key(
            getattr(persistent, "lex_activation_key", ""),
            getattr(store, "lex_device_label_edit", "") or persistent.lex_device_label or "Ren'Py Device",
            notify,
            False,
        )
        if ok:
            lex_flush_queue(False)
            lex_refresh_bootstrap(False)
        if restart:
            renpy.restart_interaction()
        return ok

    def lex_try_auto_activate(notify=False):
        token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if token:
            return True
        if not lex_load_activation_file(notify, False):
            return False
        return lex_activate_with_key(
            getattr(persistent, "lex_activation_key", ""),
            getattr(store, "lex_device_label_edit", "") or persistent.lex_device_label or "Ren'Py Device",
            notify,
            False,
        )

    def lex_auto_activate_once():
        if getattr(store, "lex_auto_activate_checked", False):
            return
        store.lex_auto_activate_checked = True
        lex_try_auto_activate(False)

    def lex_apply_remote_state(data):
        if type(data) is not dict:
            data = {}
        user = data.get("user", {})
        if type(user) is not dict:
            user = {}
        persistent.lex_last_bootstrap = data
        persistent.lex_linked_name = lex_to_text(user.get("name")).strip()
        persistent.lex_linked_email = lex_to_text(user.get("email")).strip()
        persistent.lex_linked_plan = lex_to_text(data.get("plan") or user.get("plan") or "free").strip() or "free"
        settings = data.get("settings", {})
        if type(settings) is not dict:
            settings = {}
        persistent.lex_remote_settings = settings

    def lex_disconnect_device():
        persistent.lex_device_token = ""
        persistent.lex_linked_name = ""
        persistent.lex_linked_email = ""
        persistent.lex_linked_plan = ""
        persistent.lex_last_bootstrap = {}
        persistent.lex_last_sync_error = ""
        store.lex_auto_activate_checked = True
        renpy.notify("Device disconnected")
        renpy.restart_interaction()

    def lex_refresh_bootstrap(notify=True):
        token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if not token:
            lex_try_auto_activate(False)
            token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if not token:
            if notify:
                renpy.notify("Положите nvl_translate_key.json в папку game/")
            return False
        data, err = lex_request_json("/api/mod/bootstrap", None, token)
        if err and lex_is_device_auth_error(err):
            persistent.lex_device_token = ""
            if lex_try_auto_activate(False):
                token = (getattr(persistent, "lex_device_token", "") or "").strip()
                data, err = lex_request_json("/api/mod/bootstrap", None, token)
        if err:
            persistent.lex_last_sync_error = err
            store.lex_translate_error = err
            if notify:
                renpy.notify(err)
            return False
        lex_apply_remote_state(data)
        persistent.lex_last_sync_error = ""
        if notify:
            renpy.notify("Connected: %s" % (persistent.lex_linked_name or persistent.lex_linked_email or persistent.lex_linked_plan))
        return True

    def lex_save_connection_settings():
        persistent.lex_api_base = (store.lex_api_base_edit or "").strip() or lex_default_api_base()
        persistent.lex_device_label = (store.lex_device_label_edit or "").strip() or "Ren'Py Device"
        renpy.notify("Connection settings saved")
        renpy.restart_interaction()

    def lex_prompt_api_base():
        current = lex_to_text(getattr(store, "lex_api_base_edit", "") or persistent.lex_api_base or lex_default_api_base())
        value = renpy.input("API base URL:", default=current, length=120)
        store.lex_api_base_edit = lex_to_text(value).strip() or lex_default_api_base()
        renpy.restart_interaction()

    def lex_prompt_device_label():
        current = lex_to_text(getattr(store, "lex_device_label_edit", "") or persistent.lex_device_label or "Ren'Py Device")
        value = renpy.input("Device label:", default=current, length=60)
        store.lex_device_label_edit = lex_to_text(value).strip() or "Ren'Py Device"
        renpy.restart_interaction()

    LEX_FONT = "fonts/DejaVuSans.ttf"
    lex_has_font = renpy.loadable(LEX_FONT)

    if not hasattr(store, "lex_translate_error"):
        store.lex_translate_error = ""
    if (not hasattr(persistent, "lex_enabled")) or (persistent.lex_enabled is None):
        persistent.lex_enabled = True

    if (not hasattr(persistent, "lex_custom")) or (persistent.lex_custom is None) or (type(persistent.lex_custom) is not dict):
        persistent.lex_custom = {}

    if (not hasattr(persistent, "lex_patterns")) or (persistent.lex_patterns is None) or (type(persistent.lex_patterns) is not dict):
        persistent.lex_patterns = {}

    if (not hasattr(persistent, "lex_api_base")) or (persistent.lex_api_base is None):
        persistent.lex_api_base = lex_default_api_base()
    elif lex_to_text(persistent.lex_api_base).strip() == "http://localhost:3000":
        persistent.lex_api_base = lex_default_api_base()
    if (not hasattr(persistent, "lex_activation_key")) or (persistent.lex_activation_key is None):
        persistent.lex_activation_key = ""
    if (not hasattr(persistent, "lex_device_token")) or (persistent.lex_device_token is None):
        persistent.lex_device_token = ""
    if (not hasattr(persistent, "lex_device_label")) or (persistent.lex_device_label is None):
        persistent.lex_device_label = "Ren'Py Device"
    if (not hasattr(persistent, "lex_linked_name")) or (persistent.lex_linked_name is None):
        persistent.lex_linked_name = ""
    if (not hasattr(persistent, "lex_linked_email")) or (persistent.lex_linked_email is None):
        persistent.lex_linked_email = ""
    if (not hasattr(persistent, "lex_linked_plan")) or (persistent.lex_linked_plan is None):
        persistent.lex_linked_plan = ""
    if (not hasattr(persistent, "lex_last_sync_error")) or (persistent.lex_last_sync_error is None):
        persistent.lex_last_sync_error = ""
    if (not hasattr(persistent, "lex_last_bootstrap")) or (persistent.lex_last_bootstrap is None) or (type(persistent.lex_last_bootstrap) is not dict):
        persistent.lex_last_bootstrap = {}
    if (not hasattr(persistent, "lex_remote_settings")) or (persistent.lex_remote_settings is None) or (type(persistent.lex_remote_settings) is not dict):
        persistent.lex_remote_settings = {}
    if (not hasattr(persistent, "lex_sync_queue")) or (persistent.lex_sync_queue is None) or (type(persistent.lex_sync_queue) is not list):
        persistent.lex_sync_queue = []

    if not hasattr(store, "lex_selected"):
        store.lex_selected = ""
    if not hasattr(store, "lex_edit_tr"):
        store.lex_edit_tr = ""
    if not hasattr(store, "lex_edit_note"):
        store.lex_edit_note = ""
    if not hasattr(store, "lex_open_context"):
        store.lex_open_context = ""
    if not hasattr(store, "lex_last_line"):
        store.lex_last_line = ""

    if not hasattr(store, "lex_is_pattern"):
        store.lex_is_pattern = False

    if not hasattr(store, "lex_phrase_mode"):
        store.lex_phrase_mode = False
    if not hasattr(store, "lex_phrase_buf"):
        store.lex_phrase_buf = []
    if not hasattr(store, "lex_phrase_preview"):
        store.lex_phrase_preview = ""
    if not hasattr(store, "lex_api_base_edit"):
        store.lex_api_base_edit = persistent.lex_api_base
    if not hasattr(store, "lex_device_label_edit"):
        store.lex_device_label_edit = persistent.lex_device_label
    if not hasattr(store, "lex_auto_activate_checked"):
        store.lex_auto_activate_checked = False
    if not hasattr(store, "lex_translate_busy"):
        store.lex_translate_busy = False
    if not hasattr(store, "lex_translate_job_id"):
        store.lex_translate_job_id = 0
    if not hasattr(store, "lex_translate_async_result"):
        store.lex_translate_async_result = None

    _WORD_RE = re.compile(r"([A-Za-z]+(?:'[A-Za-z]+)?)")

    def lex_norm(w):
        if not w:
            return ""
        w = w.strip()
        w = re.sub(r"^[^A-Za-z']+|[^A-Za-z']+$", "", w)
        return w.lower()

    def _split_keep_tags(text):
        parts = []
        i, n = 0, len(text)
        while i < n:
            ch = text[i]
            if ch == "{":
                j = text.find("}", i)
                if j == -1:
                    parts.append(text[i:])
                    break
                parts.append(text[i:j+1])
                i = j + 1
                continue
            if ch == "[":
                j = text.find("]", i)
                if j == -1:
                    parts.append(text[i:])
                    break
                parts.append(text[i:j+1])
                i = j + 1
                continue

            j = i + 1
            while j < n and text[j] not in "{[":
                j += 1
            parts.append(text[i:j])
            i = j
        return parts

    def lexify(text):
        if not persistent.lex_enabled:
            return text
        if text is None:
            return ""

        out = []
        for part in _split_keep_tags(text):
            if (part.startswith("{") and part.endswith("}")) or (part.startswith("[") and part.endswith("]")):
                out.append(part)
                continue

            def repl(m):
                raw = m.group(0)
                key = lex_norm(raw)
                if not key:
                    return raw
                return "{a=lex:%s}%s{/a}" % (key, raw)

            out.append(_WORD_RE.sub(repl, part))

        return "".join(out)

    def lex_plain_context(s):
        if s is None:
            return ""
        try:
            s = renpy.filter_text_tags(s, allow=None)
        except Exception:
            s = re.sub(r"\{[^}]*\}", "", s)

        s = s.replace("\n", " ").replace("\r", " ")
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def lex_context_now():
        try:
            hl = getattr(renpy.store, "_history_list", None)
            if hl:
                for e in reversed(hl):
                    if getattr(e, "kind", None) == "current":
                        w = getattr(e, "what", None)
                        if w:
                            return lex_plain_context(w)
                for e in reversed(hl):
                    w = getattr(e, "what", None)
                    if w:
                        return lex_plain_context(w)
        except Exception:
            pass
        return (store.lex_last_line or "").strip()

    def _ensure_entry(d, key):
        e = d.get(key)
        if e is None or type(e) is not dict:
            e = {}
        if "tr" not in e or e["tr"] is None:
            e["tr"] = ""
        if "note" not in e or e["note"] is None:
            e["note"] = ""
        if "status" not in e or e["status"] not in ("new", "hard", "learned"):
            e["status"] = "new"
        if "clicks" not in e or e["clicks"] is None:
            e["clicks"] = 0
        d[key] = e
        return e

    def _inc_click(d, key):
        e = _ensure_entry(d, key)
        try:
            e["clicks"] = int(e.get("clicks", 0) or 0) + 1
        except Exception:
            e["clicks"] = 1
        d[key] = e

    def _cycle_status(d, key):
        e = _ensure_entry(d, key)
        s = e.get("status", "new")
        if s == "new":
            e["status"] = "hard"
        elif s == "hard":
            e["status"] = "learned"
        else:
            e["status"] = "new"
        d[key] = e

    def _status_prio(s):
        if s == "hard":
            return 0
        if s == "new":
            return 1
        return 2

    def lex_open_word(word):
        w = lex_norm(word)
        if not w:
            return None

        store.lex_is_pattern = False
        store.lex_selected = w
        store.lex_open_context = lex_context_now() or ""

        _inc_click(persistent.lex_custom, w)
        e = _ensure_entry(persistent.lex_custom, w)

        store.lex_edit_tr = e.get("tr", "")
        existing_note = e.get("note", "")
        store.lex_edit_note = existing_note if existing_note.strip() else store.lex_open_context

        renpy.show_screen("lex_popup")
        renpy.restart_interaction()
        return None

    def lex_open_pattern(p):
        p = (p or "").strip()
        if not p:
            return None

        store.lex_is_pattern = True
        store.lex_selected = p
        store.lex_open_context = lex_context_now() or ""

        _inc_click(persistent.lex_patterns, p)
        e = _ensure_entry(persistent.lex_patterns, p)

        store.lex_edit_tr = e.get("tr", "")
        existing_note = e.get("note", "")
        store.lex_edit_note = existing_note if existing_note.strip() else store.lex_open_context

        renpy.show_screen("lex_popup")
        renpy.restart_interaction()
        return None

    def lex_get_current_entry():
        if not store.lex_selected:
            return {"tr": "", "note": "", "status": "new", "clicks": 0}
        d = persistent.lex_patterns if store.lex_is_pattern else persistent.lex_custom
        return _ensure_entry(d, store.lex_selected)

    def lex_queue_payload(payload):
        if type(payload) is not dict:
            return False
        text = (payload.get("text") or "").strip()
        if not text:
            return False
        if type(persistent.lex_sync_queue) is not list:
            persistent.lex_sync_queue = []
        persistent.lex_sync_queue.append(payload)
        return True

    def lex_flush_queue(notify=True):
        if type(persistent.lex_sync_queue) is not list:
            persistent.lex_sync_queue = []
        queue = list(persistent.lex_sync_queue)
        token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if not token:
            lex_try_auto_activate(False)
            token = (getattr(persistent, "lex_device_token", "") or "").strip()
        if not token:
            if notify and queue:
                renpy.notify("Сохранено локально. Положите nvl_translate_key.json в папку game/")
            return False
        if not queue:
            if notify:
                renpy.notify("Queue is empty")
            return True

        remaining = []
        synced = 0
        last_error = ""

        for idx in range(len(queue)):
            payload = queue[idx]
            _data, err = lex_request_json("/api/mod/items", payload, token)
            if err:
                last_error = err
                remaining.extend(queue[idx:])
                break
            synced += 1

        persistent.lex_sync_queue = remaining
        if last_error:
            persistent.lex_last_sync_error = last_error
            store.lex_translate_error = last_error
            if notify:
                renpy.notify("Sync pending: %d" % len(remaining))
            return False

        persistent.lex_last_sync_error = ""
        lex_refresh_bootstrap(False)
        if notify:
            renpy.notify("Synced: %d" % synced)
        return True

    def lex_build_current_payload():
        key = (store.lex_selected or "").strip()
        if not key:
            return None
        d = persistent.lex_patterns if store.lex_is_pattern else persistent.lex_custom
        e = _ensure_entry(d, key)
        note = (store.lex_edit_note or e.get("note", "") or "").strip()
        context = (store.lex_open_context or lex_context_now() or "").strip()
        if not note:
            note = context
        translation = (store.lex_edit_tr or e.get("tr", "") or "").strip()
        return {
            "kind": "phrase" if store.lex_is_pattern else "word",
            "text": key,
            "translation": translation,
            "note": note,
            "contextOriginal": context,
            "contextTranslation": "",
            "novelTitle": lex_novel_title(),
        }

    def lex_sync_current_payload(notify=True):
        payload = lex_build_current_payload()
        if not payload:
            return False
        if not lex_queue_payload(payload):
            return False
        return lex_flush_queue(notify)

    def lex_activate_from_settings():
        persistent.lex_api_base = (store.lex_api_base_edit or "").strip() or lex_default_api_base()
        persistent.lex_device_label = (store.lex_device_label_edit or "").strip() or "Ren'Py Device"
        if not lex_load_activation_file(True, False, False):
            renpy.restart_interaction()
            return
        if lex_activate_with_key(
            getattr(persistent, "lex_activation_key", ""),
            persistent.lex_device_label,
            True,
            False,
        ):
            lex_flush_queue(False)
            lex_refresh_bootstrap(False)
        renpy.restart_interaction()

    def lex_save_current():
        key = store.lex_selected
        if not key:
            return

        d = persistent.lex_patterns if store.lex_is_pattern else persistent.lex_custom
        e = _ensure_entry(d, key)

        e["tr"] = (store.lex_edit_tr or "").strip()
        e["note"] = (store.lex_edit_note or "").strip()

        if (not e["tr"]) and (not e["note"]):
            if key in d:
                del d[key]
                renpy.notify("Deleted")
                renpy.restart_interaction()
                return

        if lex_sync_current_payload(False):
            renpy.notify("Saved + synced")
        else:
            renpy.notify("Saved locally")
        renpy.restart_interaction()

    def lex_add_later_current():
        key = store.lex_selected
        if not key:
            return

        d = persistent.lex_patterns if store.lex_is_pattern else persistent.lex_custom
        e = _ensure_entry(d, key)

        e["tr"] = (e.get("tr", "") or "").strip()
        note = (store.lex_edit_note or "").strip()
        if not note:
            note = (store.lex_open_context or lex_context_now() or "").strip()
        e["note"] = note
        if lex_sync_current_payload(False):
            renpy.notify("Added + synced")
        else:
            renpy.notify("Added locally")
        renpy.restart_interaction()

    def lex_delete_current():
        key = store.lex_selected
        if not key:
            return
        d = persistent.lex_patterns if store.lex_is_pattern else persistent.lex_custom
        if key in d:
            del d[key]
        renpy.notify("Deleted")
        renpy.restart_interaction()

    def lex_cycle_status_current():
        key = store.lex_selected
        if not key:
            return
        d = persistent.lex_patterns if store.lex_is_pattern else persistent.lex_custom
        _cycle_status(d, key)
        renpy.restart_interaction()

    def lex_delete_word(w):
        w = lex_norm(w)
        if w in persistent.lex_custom:
            del persistent.lex_custom[w]
        renpy.restart_interaction()

    def lex_delete_pattern(p):
        p = (p or "").strip()
        if p in persistent.lex_patterns:
            del persistent.lex_patterns[p]
        renpy.restart_interaction()

    def lex_cycle_status_word(w):
        w = lex_norm(w)
        if not w:
            return
        _cycle_status(persistent.lex_custom, w)
        renpy.restart_interaction()

    def lex_cycle_status_pattern(p):
        p = (p or "").strip()
        if not p:
            return
        _cycle_status(persistent.lex_patterns, p)
        renpy.restart_interaction()

    def lex_toggle():
        persistent.lex_enabled = not persistent.lex_enabled
        renpy.notify("Lex: %s" % ("ON" if persistent.lex_enabled else "OFF"))
        renpy.restart_interaction()

    def lex_phrase_toggle():
        store.lex_phrase_mode = not store.lex_phrase_mode
        store.lex_phrase_buf = []
        store.lex_phrase_preview = ""
        renpy.notify("Pattern mode: %s" % ("ON" if store.lex_phrase_mode else "OFF"))
        renpy.restart_interaction()

    def lex_phrase_add(word):
        w = lex_norm(word)
        if not w:
            return
        store.lex_phrase_buf.append(w)
        store.lex_phrase_preview = " ".join(store.lex_phrase_buf)
        _inc_click(persistent.lex_custom, w)
        renpy.restart_interaction()

    def lex_phrase_pop():
        if store.lex_phrase_buf:
            store.lex_phrase_buf.pop()
            store.lex_phrase_preview = " ".join(store.lex_phrase_buf)
        renpy.restart_interaction()

    def lex_phrase_clear():
        store.lex_phrase_buf = []
        store.lex_phrase_preview = ""
        renpy.restart_interaction()

    def lex_phrase_open():
        p = " ".join(store.lex_phrase_buf).strip()
        if not p:
            renpy.notify("Empty pattern")
            return
        return lex_open_pattern(p)

    def lex_click(value):
        if store.lex_phrase_mode:
            lex_phrase_add(value)
            return None
        return lex_open_word(value)

    def lex_list_words(q):
        ql = (q or "").strip().lower()
        rows = []
        for w in list(persistent.lex_custom.keys()):
            e = _ensure_entry(persistent.lex_custom, w)
            tr = (e.get("tr", "") or "")
            note = (e.get("note", "") or "")
            if ql:
                if (ql not in w.lower()) and (ql not in tr.lower()) and (ql not in note.lower()):
                    continue
            st = e.get("status", "new")
            ck = int(e.get("clicks", 0) or 0)
            rows.append((w, tr, note, st, ck))
        rows.sort(key=lambda t: (_status_prio(t[3]), -t[4], t[0]))
        return rows

    def lex_list_patterns(q):
        ql = (q or "").strip().lower()
        rows = []
        for p in list(persistent.lex_patterns.keys()):
            e = _ensure_entry(persistent.lex_patterns, p)
            tr = (e.get("tr", "") or "")
            note = (e.get("note", "") or "")
            if ql:
                if (ql not in p.lower()) and (ql not in tr.lower()) and (ql not in note.lower()):
                    continue
            st = e.get("status", "new")
            ck = int(e.get("clicks", 0) or 0)
            rows.append((p, tr, note, st, ck))
        rows.sort(key=lambda t: (_status_prio(t[3]), -t[4], t[0]))
        return rows

    def lex_export_words_tsv():
        rows = lex_list_words("")
        return u"\n".join([u"%s\t%s\t%s\t%s\t%s" % (w, tr.strip(), note.strip(), st, ck) for (w, tr, note, st, ck) in rows])

    def lex_export_patterns_tsv():
        rows = lex_list_patterns("")
        return u"\n".join([u"%s\t%s\t%s\t%s\t%s" % (p, tr.strip(), note.strip(), st, ck) for (p, tr, note, st, ck) in rows])

    if not hasattr(config, "hyperlink_handlers") or config.hyperlink_handlers is None:
        config.hyperlink_handlers = {}
    config.hyperlink_handlers["lex"] = lex_click

    old_filter = getattr(config, "say_menu_text_filter", None)

    def combined_filter(s):
        if old_filter:
            try:
                s = old_filter(s)
            except Exception:
                pass
        return lexify(s)

    if hasattr(config, "say_menu_text_filter"):
        config.say_menu_text_filter = combined_filter
    elif hasattr(config, "say_text_filter"):
        config.say_text_filter = combined_filter

    if "lex_overlay" not in config.overlay_screens:
        config.overlay_screens.append("lex_overlay")

    def lex_char_cb(event, **kwargs):
        if event in ("show", "begin", "slow_done"):
            w = kwargs.get("what", None)
            if w:
                store.lex_last_line = lex_plain_context(w)

    try:
        cbs = getattr(config, "all_character_callbacks", None)
        if cbs is None:
            config.all_character_callbacks = [lex_char_cb]
        else:
            if lex_char_cb not in cbs:
                cbs.append(lex_char_cb)
    except Exception:
        config.character_callback = lex_char_cb


init -998:
    style lex_text is default
    style lex_input is input
    style lex_small is default

    style lex_small:
        size 14


init -997 python:
    if lex_has_font:
        style.lex_text.font = LEX_FONT
        style.lex_input.font = LEX_FONT
        style.lex_small.font = LEX_FONT


screen lex_overlay():
    key "K_F6" action ToggleScreen("lex_settings")
    key "K_F8" action Function(lex_toggle)
    key "K_F9" action ToggleScreen("lex_wordlist")
    key "K_F7" action Function(lex_phrase_toggle)
    timer 0.2 action Function(lex_auto_activate_once)
    if getattr(store, "lex_translate_busy", False):
        timer 0.15 action Function(lex_poll_translate_job) repeat True

    if lex_phrase_mode:
        key "K_RETURN" action Function(lex_phrase_open)
        key "K_BACKSPACE" action Function(lex_phrase_pop)
        key "K_DELETE" action Function(lex_phrase_clear)

        frame:
            xalign 0.5
            yalign 0.02
            xmaximum 0.96
            padding (16, 10)

            vbox:
                spacing 6
                text "Pattern mode (F7). Click words to build. Enter=Open. Backspace=Undo. Delete=Clear." style "lex_small"
                if lex_phrase_preview:
                    text "[lex_phrase_preview]" style "lex_text" size 18
                else:
                    text "(empty)" style "lex_text" size 18


screen lex_popup():
    modal True
    zorder 200
    default tr_value = VariableInputValue("lex_edit_tr")
    default note_value = VariableInputValue("lex_edit_note")

    key "K_ESCAPE" action Hide("lex_popup")
    key "mouseup_3" action Hide("lex_popup")

    frame:
        xalign 0.5
        yalign 0.5
        xmaximum 0.90
        padding (26, 18)

        vbox:
            spacing 12

            $ e = lex_get_current_entry()
            $ st = e.get("status","new")
            $ ck = int(e.get("clicks",0) or 0)

            if lex_is_pattern:
                text "PATTERN: [lex_selected]" style "lex_text" size 30
            else:
                text "WORD: [lex_selected]" style "lex_text" size 34

            text "Status: [st]   Clicks: [ck]" style "lex_small"

            if lex_open_context:
                text "Context:" style "lex_text" size 16
                text "[lex_open_context]" style "lex_text" size 16

            text "Translation / meaning:" style "lex_text" size 18
            input id "lex_tr_input" value tr_value style "lex_input" length 100
            if getattr(store, "lex_translate_busy", False):
                text "Translating... the game stays responsive while the request is running." style "lex_small"

            text "Note (context / example):" style "lex_text" size 18
            input value note_value style "lex_input" length 220

            hbox:
                spacing 10
                textbutton "Save" action [Function(lex_save_current), Hide("lex_popup")]
                textbutton "Add later" action [Function(lex_add_later_current), Hide("lex_popup")]
                textbutton "Status" action Function(lex_cycle_status_current)
                if getattr(store, "lex_translate_busy", False):
                    textbutton "Translating..." action Function(renpy.notify, "Translation is still running")
                else:
                    textbutton "Put the translation" action Function(lex_translate_to_input, tr_value)
                textbutton "Paste to translation" action Function(lex_paste_to, "lex_edit_tr")
                textbutton "Copy" action CopyToClipboard(lex_selected)
                textbutton "Paste" action Function(lex_paste_to, "lex_edit_tr")
                textbutton "Delete" action Function(lex_delete_current)
                textbutton "Close" action Hide("lex_popup")
                textbutton "Copy error" action CopyToClipboard(store.lex_translate_error)

            text "F6: Sync settings | F8: Lex ON/OFF | F9: Lists | F7: Pattern mode" style "lex_small"


screen lex_settings():
    modal True
    zorder 195

    key "K_ESCAPE" action Hide("lex_settings")
    key "mouseup_3" action Hide("lex_settings")

    frame:
        xalign 0.5
        yalign 0.5
        xmaximum 0.92
        ymaximum 0.90
        padding (24, 18)

        vbox:
            spacing 12

            $ boot = persistent.lex_last_bootstrap if type(persistent.lex_last_bootstrap) is dict else {}
            $ usage = boot.get("usage", {})
            if type(usage) is not dict:
                $ usage = {}
            $ usage_count = usage.get("count", 0)
            $ usage_limit = usage.get("limit", None)
            $ queue_count = len(persistent.lex_sync_queue) if type(persistent.lex_sync_queue) is list else 0
            $ activation_file_display = "найден" if lex_activation_file_present() else "не найден"
            $ activation_file_label = lex_activation_file_label()
            $ activation_key_display = lex_activation_key_preview()
            $ linked_name_display = (persistent.lex_linked_name or "-")
            $ linked_email_display = (persistent.lex_linked_email or "-")
            $ linked_plan_display = (persistent.lex_linked_plan or "-")
            $ game_dir_display = lex_game_dir() or "-"
            $ last_error_display = lex_escape_text_tags(persistent.lex_last_sync_error or "")

            text "NVLingo Sync" style "lex_text" size 28
            text "Put nvl_translate_key.json into game/ and the mod will activate itself." style "lex_small"

            text "Activation file:" style "lex_text" size 18
            text "[activation_file_display]" style "lex_text" size 16
            text "[activation_file_label]" style "lex_small"

            text "Activation key:" style "lex_text" size 18
            text "[activation_key_display]" style "lex_text" size 16

            hbox:
                spacing 10
                textbutton "Load activation file" action Function(lex_load_activation_file)
                textbutton "Activate from file" action Function(lex_activate_from_settings)
                textbutton "Refresh" action Function(lex_refresh_bootstrap)
                textbutton "Sync queue" action Function(lex_flush_queue)
                textbutton "Disconnect" action Function(lex_disconnect_device)
                textbutton "Close" action Hide("lex_settings")

            text "Linked user: [linked_name_display]" style "lex_text" size 16
            text "Email: [linked_email_display]" style "lex_text" size 16
            text "Plan: [linked_plan_display]" style "lex_text" size 16
            text "Queued items: [queue_count]" style "lex_text" size 16
            text "Game folder: [game_dir_display]" style "lex_small"
            if usage_limit is None:
                text "Translations today: [usage_count] / infinity" style "lex_text" size 16
            else:
                text "Translations today: [usage_count] / [usage_limit]" style "lex_text" size 16

            if persistent.lex_last_sync_error:
                text "Last error:" style "lex_text" size 16
                text "[last_error_display]" style "lex_small"

            text "Tip: F6 opens this window. The mod reads nvl_translate_key.json and uses your site backend as a Yandex Cloud proxy." style "lex_small"


screen lex_wordlist():
    modal True
    zorder 190

    default tab = "words"
    default q = ""

    key "K_ESCAPE" action Hide("lex_wordlist")
    key "mouseup_3" action Hide("lex_wordlist")

    frame:
        xalign 0.5
        yalign 0.5
        xmaximum 0.92
        ymaximum 0.90
        padding (24, 18)

        vbox:
            spacing 12

            hbox:
                spacing 12
                textbutton "Words" action SetScreenVariable("tab", "words")
                textbutton "Patterns" action SetScreenVariable("tab", "patterns")
                textbutton "Close" action Hide("lex_wordlist")

            hbox:
                spacing 10
                text "Search:" style "lex_text" size 18
                input value ScreenVariableInputValue("q") style "lex_input" length 40

            if tab == "words":
                $ export_data = lex_export_words_tsv()
                $ items = lex_list_words(q)
            else:
                $ export_data = lex_export_patterns_tsv()
                $ items = lex_list_patterns(q)

            hbox:
                spacing 10
                textbutton "Copy TSV" action CopyToClipboard(export_data)

            viewport:
                ymaximum 560
                mousewheel True
                draggable True

                vbox:
                    spacing 8

                    if not items:
                        text "Empty." style "lex_text" size 18
                    else:
                        for it in items:
                            $ key = it[0]
                            $ tr = it[1]
                            $ note = it[2]
                            $ st = it[3]
                            $ ck = it[4]

                            frame:
                                xfill True
                                padding (12, 10)
                                vbox:
                                    spacing 6
                                    text "[key]  ([st], [ck])" style "lex_text" size 18
                                    if tr:
                                        text "— [tr]" style "lex_text" size 16
                                    if note:
                                        text "[note]" style "lex_text" size 14

                                    hbox:
                                        spacing 10
                                        if tab == "words":
                                            textbutton "Open" action Function(lex_open_word, key)
                                            textbutton "Status" action Function(lex_cycle_status_word, key)
                                            textbutton "Copy" action CopyToClipboard(key)
                                            textbutton "Delete" action Function(lex_delete_word, key)
                                        else:
                                            textbutton "Open" action Function(lex_open_pattern, key)
                                            textbutton "Status" action Function(lex_cycle_status_pattern, key)
                                            textbutton "Copy" action CopyToClipboard(key)
                                            textbutton "Delete" action Function(lex_delete_pattern, key)

            text "F6: Sync settings | F8: Lex ON/OFF | F9: Lists | F7: Pattern mode" style "lex_small"

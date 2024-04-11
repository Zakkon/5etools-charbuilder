globalThis.JqueryUtil = {
    _isEnhancementsInit: false,
    initEnhancements() {
        if (JqueryUtil._isEnhancementsInit)
            return;
        JqueryUtil._isEnhancementsInit = true;

        JqueryUtil.addSelectors();

        window.$$ = function(parts, ...args) {
            if (parts instanceof jQuery || parts instanceof HTMLElement) {
                return (...passed)=>{
                    const parts2 = [...passed[0]];
                    const args2 = passed.slice(1);
                    parts2[0] = `<div>${parts2[0]}`;
                    parts2.last(`${parts2.last()}</div>`);

                    const $temp = $$(parts2, ...args2);
                    $temp.children().each((i,e)=>$(e).appendTo(parts));
                    return parts;
                }
                ;
            } else {
                const $eles = [];
                let ixArg = 0;

                const handleArg = (arg)=>{
                    if (arg instanceof $) {
                        $eles.push(arg);
                        return `<${arg.tag()} data-r="true"></${arg.tag()}>`;
                    } else if (arg instanceof HTMLElement) {
                        return handleArg($(arg));
                    } else
                        return arg;
                }
                ;
                const raw = parts.reduce((html,p)=>{
                    const myIxArg = ixArg++;
                    if (args[myIxArg] == null)
                        return `${html}${p}`;
                    if (args[myIxArg]instanceof Array)
                        return `${html}${args[myIxArg].map(arg=>handleArg(arg)).join("")}${p}`;
                    else
                        return `${html}${handleArg(args[myIxArg])}${p}`;
                }
                );
                const $res = $(raw);

                if ($res.length === 1) {
                    if ($res.attr("data-r") === "true")
                        return $eles[0];
                    else
                        $res.find(`[data-r=true]`).replaceWith(i=>$eles[i]);
                } else {
                    const $tmp = $(`<div></div>`);
                    $tmp.append($res);
                    $tmp.find(`[data-r=true]`).replaceWith(i=>$eles[i]);
                    return $tmp.children();
                }

                return $res;
            }
        }
        ;

        $.fn.extend({
            disableSpellcheck: function() {
                return this.attr("autocomplete", "new-password").attr("autocapitalize", "off").attr("spellcheck", "false");
            },
            tag: function() {
                return this.prop("tagName").toLowerCase();
            },
            title: function(...args) {
                return this.attr("title", ...args);
            },
            placeholder: function(...args) {
                return this.attr("placeholder", ...args);
            },
            disable: function() {
                return this.attr("disabled", true);
            },

            fastSetHtml: function(html) {
                if (!this.length)
                    return this;
                let tgt = this[0];
                while (tgt.children.length) {
                    tgt = tgt.children[0];
                }
                tgt.innerHTML = html;
                return this;
            },

            blurOnEsc: function() {
                return this.keydown(evt=>{
                    if (evt.which === 27)
                        this.blur();
                }
                );
            },

            hideVe: function() {
                return this.addClass("ve-hidden");
            },
            showVe: function() {
                return this.removeClass("ve-hidden");
            },
            toggleVe: function(val) {
                if (val === undefined)
                    return this.toggleClass("ve-hidden", !this.hasClass("ve-hidden"));
                else
                    return this.toggleClass("ve-hidden", !val);
            },
        });

        $.event.special.destroyed = {
            remove: function(o) {
                if (o.handler)
                    o.handler();
            },
        };
    },

    addSelectors() {
        $.expr[":"].textEquals = (el,i,m)=>$(el).text().toLowerCase().trim() === m[3].unescapeQuotes();

        $.expr[":"].containsInsensitive = (el,i,m)=>{
            const searchText = m[3];
            const textNode = $(el).contents().filter((i,e)=>e.nodeType === 3)[0];
            if (!textNode)
                return false;
            const match = textNode.nodeValue.toLowerCase().trim().match(`${searchText.toLowerCase().trim().escapeRegexp()}`);
            return match && match.length > 0;
        }
        ;
    },

    showCopiedEffect(eleOr$Ele, text="Copied!", bubble) {
        const $ele = eleOr$Ele instanceof $ ? eleOr$Ele : $(eleOr$Ele);

        const top = $(window).scrollTop();
        const pos = $ele.offset();

        const animationOptions = {
            top: "-=8",
            opacity: 0,
        };
        if (bubble) {
            animationOptions.left = `${Math.random() > 0.5 ? "-" : "+"}=${~~(Math.random() * 17)}`;
        }
        const seed = Math.random();
        const duration = bubble ? 250 + seed * 200 : 250;
        const offsetY = bubble ? 16 : 0;

        const $dispCopied = $(`<div class="clp__disp-copied ve-flex-vh-center py-2 px-4"></div>`);
        $dispCopied.html(text).css({
            top: (pos.top - 24) + offsetY - top,
            left: pos.left + ($ele.width() / 2),
        }).appendTo(document.body).animate(animationOptions, {
            duration,
            complete: ()=>$dispCopied.remove(),
            progress: (_,progress)=>{
                if (bubble) {
                    const diffProgress = 0.5 - progress;
                    animationOptions.top = `${diffProgress > 0 ? "-" : "+"}=40`;
                    $dispCopied.css("transform", `rotate(${seed > 0.5 ? "-" : ""}${seed * 500 * progress}deg)`);
                }
            }
            ,
        }, );
    },

    _dropdownInit: false,
    bindDropdownButton($ele) {
        if (!JqueryUtil._dropdownInit) {
            JqueryUtil._dropdownInit = true;
            document.addEventListener("click", ()=>[...document.querySelectorAll(`.open`)].filter(ele=>!(ele.className || "").split(" ").includes(`dropdown--navbar`)).forEach(ele=>ele.classList.remove("open")));
        }
        $ele.click(()=>setTimeout(()=>$ele.parent().addClass("open"), 1));
    },

    _WRP_TOAST: null,
    _ACTIVE_TOAST: [],
    doToast(options) {
        if (typeof window === "undefined")
            return;

        if (JqueryUtil._WRP_TOAST == null) {
            JqueryUtil._WRP_TOAST = e_({
                tag: "div",
                clazz: "toast__container no-events w-100 overflow-y-hidden ve-flex-col",
            });
            document.body.appendChild(JqueryUtil._WRP_TOAST);
        }

        if (typeof options === "string") {
            options = {
                content: options,
                type: "info",
            };
        }
        options.type = options.type || "info";

        options.isAutoHide = options.isAutoHide ?? true;
        options.autoHideTime = options.autoHideTime ?? 5000;

        const eleToast = e_({
            tag: "div",
            clazz: `toast toast--type-${options.type} events-initial relative my-2 mx-auto`,
            children: [e_({
                tag: "div",
                clazz: "toast__wrp-content",
                children: [options.content instanceof $ ? options.content[0] : options.content, ],
            }), e_({
                tag: "div",
                clazz: "toast__wrp-control",
                children: [e_({
                    tag: "button",
                    clazz: "btn toast__btn-close",
                    children: [e_({
                        tag: "span",
                        clazz: "glyphicon glyphicon-remove",
                    }), ],
                }), ],
            }), ],
            mousedown: evt=>{
                evt.preventDefault();
            }
            ,
            click: evt=>{
                evt.preventDefault();
                JqueryUtil._doToastCleanup(toastMeta);

                if (!evt.shiftKey)
                    return;
                [...JqueryUtil._ACTIVE_TOAST].forEach(toastMeta=>JqueryUtil._doToastCleanup(toastMeta));
            }
            ,
        });

        eleToast.prependTo(JqueryUtil._WRP_TOAST);

        const toastMeta = {
            isAutoHide: !!options.isAutoHide,
            eleToast
        };
        JqueryUtil._ACTIVE_TOAST.push(toastMeta);

        AnimationUtil.pRecomputeStyles().then(()=>{
            eleToast.addClass(`toast--animate`);

            if (options.isAutoHide) {
                setTimeout(()=>{
                    JqueryUtil._doToastCleanup(toastMeta);
                }
                , options.autoHideTime);
            }

            if (JqueryUtil._ACTIVE_TOAST.length >= 3) {
                JqueryUtil._ACTIVE_TOAST.filter(({isAutoHide})=>!isAutoHide).forEach(toastMeta=>{
                    JqueryUtil._doToastCleanup(toastMeta);
                }
                );
            }
        }
        );
    },

    _doToastCleanup(toastMeta) {
        toastMeta.eleToast.removeClass("toast--animate");
        JqueryUtil._ACTIVE_TOAST.splice(JqueryUtil._ACTIVE_TOAST.indexOf(toastMeta), 1);
        setTimeout(()=>toastMeta.eleToast.parentElement && toastMeta.eleToast.remove(), 85);
    },

    isMobile() {
        if (navigator?.userAgentData?.mobile)
            return true;
        return window.matchMedia("(max-width: 768px)").matches;
    },
};

class JqueryExtension {
    static init() {
        $.fn.extend({

            swap: function($eleMap) {
                Object.entries($eleMap).forEach(([k,$v])=>{
                    this.find(`[data-r="${k}"]`).replaceWith($v);
                }
                );

                return this;
            },
        });
    }
}